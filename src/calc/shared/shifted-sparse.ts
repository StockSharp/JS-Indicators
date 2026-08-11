// Shared by the shifted-sparse indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../../indicator-definition.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../../sequential-processor.js';
import {
    type RollingWindowCheckpoint,
} from '../../math/index.js';
import {
    finite,
} from './guards.js';

export function period(
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    name: string,
): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || (resolved as number) < minimum
        || (resolved as number) > maximum) {
        throw new RangeError(
            `sschart: indicator ${name} must be an integer from ${minimum} to ${maximum}`,
        );
    }
    return resolved as number;
}

export function lineStyle(color: string, options: Readonly<Record<string, string | number | boolean>> = {}) {
    return {
        series: IndicatorSeriesStyle.Line,
        color,
        lineWidth: 1,
        options: { priceLineVisible: false, ...options },
    } as const;
}

export function alligatorParameterSchema() {
    return [
        {
            id: 'jawLength', name: 'Jaw Length', type: IndicatorParameterType.Integer,
            defaultValue: 13, min: 1, max: 200, step: 1,
        },
        {
            id: 'jawShift', name: 'Jaw Shift', type: IndicatorParameterType.Integer,
            defaultValue: 8, min: 0, max: 100, step: 1,
        },
        {
            id: 'teethLength', name: 'Teeth Length', type: IndicatorParameterType.Integer,
            defaultValue: 8, min: 1, max: 200, step: 1,
        },
        {
            id: 'teethShift', name: 'Teeth Shift', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 0, max: 100, step: 1,
        },
        {
            id: 'lipsLength', name: 'Lips Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 200, step: 1,
        },
        {
            id: 'lipsShift', name: 'Lips Shift', type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 0, max: 100, step: 1,
        },
    ] as const;
}

/// The same six knobs, under the paths StockSharp reaches them by on a Gator: it holds two
/// histograms of two lines each, over the very same alligator, so its lips line answers to two
/// names and its own role names do not appear at all.
export function gatorParameterSchema() {
    const paths: Record<string, readonly string[]> = {
        jawLength: ['histogram1Line1Length'],
        jawShift: ['histogram1Line1Shift'],
        lipsLength: ['histogram1Line2Length', 'histogram2Line1Length'],
        lipsShift: ['histogram1Line2Shift', 'histogram2Line1Shift'],
        teethLength: ['histogram2Line2Length'],
        teethShift: ['histogram2Line2Shift'],
    };
    return alligatorParameterSchema().map((parameter) => (
        { ...parameter, aliases: paths[parameter.id] }
    ));
}

export function validWindow(value: unknown, capacity: number): value is RollingWindowCheckpoint {
    if (value === null || typeof value !== 'object') return false;
    const values = (value as RollingWindowCheckpoint).values;
    return Array.isArray(values) && values.length <= capacity
        && values.every((item) => item === null || finite(item) !== null);
}

export interface AlligatorParameters extends IndicatorParameters {
    readonly jawLength: number;
    readonly jawShift: number;
    readonly teethLength: number;
    readonly teethShift: number;
    readonly lipsLength: number;
    readonly lipsShift: number;
}

export interface ZigZagParameters extends IndicatorParameters {
    readonly deviation: number;
}

export interface ZigZagCheckpoint {
    readonly disabled: boolean;
    readonly previousClose: number | null;
    readonly lastExtremum: number | null;
    readonly isUpTrend: boolean | null;
    readonly shift: number;
}

export type ZigZagSource = 'close' | 'high' | 'low';

export type ZigZagDirection = 'both' | 'up' | 'down';

export class ZigZagFamilyProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ZigZagCheckpoint
> {
    private disabled = false;
    private previousPrice: number | null = null;
    private lastExtremum: number | null = null;
    private isUpTrend: boolean | null = null;
    private shift = 0;

    constructor(
        readonly deviation: number,
        private readonly source: ZigZagSource,
        private readonly direction: ZigZagDirection,
    ) {
        super(['value']);
        if (!(deviation > 0 && deviation < 1) || !Number.isFinite(deviation))
            throw new RangeError('sschart: indicator deviation must be finite between 0 and 1');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.[this.source]);
        if (input.index === 0) {
            if (commit) {
                this.disabled = price === null;
                this.previousPrice = price;
            }
            return { isFormed: false, values: [] };
        }
        if (this.disabled || price === null || this.previousPrice === null) {
            if (commit) this.previousPrice = price;
            return { isFormed: false, values: [] };
        }

        let lastExtremum = this.lastExtremum ?? price;
        let isUpTrend = this.isUpTrend ?? (price >= this.previousPrice);
        let shift = this.shift;
        let changed = false;
        const threshold = lastExtremum * this.deviation;
        if (isUpTrend) {
            if (lastExtremum < price) lastExtremum = price;
            else if (price <= lastExtremum - threshold) changed = true;
        } else {
            if (lastExtremum > price) lastExtremum = price;
            else if (price >= lastExtremum + threshold) changed = true;
        }

        const accepted = changed && (this.direction === 'both'
            || (this.direction === 'up' && isUpTrend)
            || (this.direction === 'down' && !isUpTrend));
        const targetIndex = this.direction === 'both' && lastExtremum === 0
            ? input.index
            : input.index - shift;
        const values = accepted
            ? [this.output('value', lastExtremum, targetIndex)]
            : [];
        if (changed) {
            isUpTrend = !isUpTrend;
            lastExtremum = price;
            shift = 1;
        } else shift += 1;
        if (commit) {
            this.previousPrice = price;
            this.lastExtremum = lastExtremum;
            this.isUpTrend = isUpTrend;
            this.shift = shift;
        }
        return { isFormed: true, values };
    }

    protected resetState(): void {
        this.disabled = false;
        this.previousPrice = null;
        this.lastExtremum = null;
        this.isUpTrend = null;
        this.shift = 0;
    }

    protected captureState(): ZigZagCheckpoint {
        return Object.freeze({
            disabled: this.disabled,
            previousClose: this.previousPrice,
            lastExtremum: this.lastExtremum,
            isUpTrend: this.isUpTrend,
            shift: this.shift,
        });
    }

    protected restoreState(state: ZigZagCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.disabled !== 'boolean'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || (state.lastExtremum !== null && finite(state.lastExtremum) === null)
            || (state.isUpTrend !== null && typeof state.isUpTrend !== 'boolean')
            || (state.lastExtremum === null) !== (state.isUpTrend === null)
            || !Number.isInteger(state.shift) || state.shift < 0) {
            throw new TypeError('sschart: invalid ZigZag checkpoint');
        }
        this.disabled = state.disabled;
        this.previousPrice = state.previousClose;
        this.lastExtremum = state.lastExtremum;
        this.isUpTrend = state.isUpTrend;
        this.shift = state.shift;
    }
}

export function strictDeviation(value: unknown): number {
    const resolved = value ?? 0.001;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved)
        || !(resolved > 0 && resolved < 1)) {
        throw new RangeError('sschart: indicator deviation must be finite between 0 and 1');
    }
    return resolved;
}
