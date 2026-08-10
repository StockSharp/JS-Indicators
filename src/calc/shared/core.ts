// Shared by the core indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
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
    RollingMaximum,
    WilderMovingAverage,
    type RollingWindowCheckpoint,
    type SeededMovingAverageCheckpoint,
} from '../../math/index.js';

export interface LengthIndicatorParameters extends IndicatorParameters {
    readonly length: number;
}

export function resolvedLength(
    parameters: LengthIndicatorParameters,
    fallback: number,
    minimum: number,
): number {
    return resolvedInteger(parameters?.length, fallback, minimum, 500, 'length');
}

export function resolvedInteger(
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

export function close(input: IndicatorProcessInput<IndicatorCandle>): number | null {
    const value = input.value?.close;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export class HighestProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly maximum: RollingMaximum;

    constructor(readonly length: number) {
        super(['line']);
        this.maximum = new RollingMaximum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        // The close, not the bar high: StockSharp's Highest inherits
        // [IndicatorIn(typeof(DecimalIndicatorValue))], so ToCandle().HighPrice
        // hands back the scalar it was fed. See chart/indicators/calc/highest.ts.
        const close = input.value?.close;
        const value = commit
            ? this.maximum.push(close)
            : this.maximum.preview(close);
        return {
            isFormed: this.maximum.isFormed || value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.maximum.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.maximum.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void {
        this.maximum.restore(state);
    }
}

export class SmoothedMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SeededMovingAverageCheckpoint
> {
    private readonly average: WilderMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new WilderMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.average.push(close(input))
            : this.average.preview(close(input));
        return {
            isFormed: this.average.isFormed || value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): SeededMovingAverageCheckpoint {
        return this.average.checkpoint();
    }
    protected restoreState(state: SeededMovingAverageCheckpoint): void {
        this.average.restore(state);
    }
}

export const LENGTH_STYLE = Object.freeze({
    series: IndicatorSeriesStyle.Line,
    lineWidth: 2,
    options: Object.freeze({ priceLineVisible: false }),
});
