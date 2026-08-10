// Shared by the recursive-statistical indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../../indicator-definition.js';
import {
    ExpandingWilderMovingAverage,
    type ExpandingWilderMovingAverageCheckpoint,
} from '../../math/index.js';
import { CommodityChannelIndexKernel } from '../../math/commodity-channel-index.js';
import {
    finite,
} from './guards.js';

export function resolvedLength(
    parameters: RecursiveLengthParameters,
    fallback: number,
    minimum: number,
    maximum: number,
): number {
    const value = parameters?.length ?? fallback;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(
            `sschart: indicator length must be an integer from ${minimum} to ${maximum}`,
        );
    }
    return value;
}

export function lineStyle(color: string, width = 2) {
    return {
        series: IndicatorSeriesStyle.Line,
        color,
        lineWidth: width,
        options: { priceLineVisible: false },
    } as const;
}

export function lengthParameter(defaultValue: number, minimum: number, maximum: number) {
    return {
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue,
        min: minimum,
        max: maximum,
        step: 1,
    } as const;
}

export interface RecursiveLengthParameters extends IndicatorParameters {
    readonly length: number;
}

export interface DirectionalCandleSnapshot {
    readonly high: number;
    readonly low: number;
    readonly close: number;
}

export interface DirectionalMovementCheckpoint {
    readonly previousCandle: DirectionalCandleSnapshot | null;
    readonly plus: ExpandingWilderMovingAverageCheckpoint;
    readonly minus: ExpandingWilderMovingAverageCheckpoint;
    readonly trueRange: ExpandingWilderMovingAverageCheckpoint;
}

export interface DirectionalMovementResult {
    readonly plusDI: number | null;
    readonly minusDI: number | null;
    readonly dx: number | null;
}

export class DirectionalMovementKernel {
    private previousCandle: DirectionalCandleSnapshot | null = null;
    private readonly plus: ExpandingWilderMovingAverage;
    private readonly minus: ExpandingWilderMovingAverage;
    private readonly trueRange: ExpandingWilderMovingAverage;

    constructor(readonly length: number) {
        this.plus = new ExpandingWilderMovingAverage(length);
        this.minus = new ExpandingWilderMovingAverage(length);
        this.trueRange = new ExpandingWilderMovingAverage(length);
    }

    process(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): DirectionalMovementResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const current = high !== null && low !== null && close !== null
            ? { high, low, close }
            : null;

        let plusMovement: number | null = null;
        let minusMovement: number | null = null;
        let trueRange: number | null = null;
        if (input.index === 0) {
            if (high !== null && low !== null) trueRange = high - low;
        } else if (high !== null && low !== null && this.previousCandle !== null) {
            const upMove = high - this.previousCandle.high;
            const downMove = this.previousCandle.low - low;
            plusMovement = upMove > downMove && upMove > 0 ? upMove : 0;
            minusMovement = downMove > upMove && downMove > 0 ? downMove : 0;
            trueRange = Math.max(
                high - low,
                Math.abs(high - this.previousCandle.close),
                Math.abs(low - this.previousCandle.close),
            );
        }

        const smoothedPlus = commit
            ? this.plus.push(plusMovement)
            : this.plus.preview(plusMovement);
        const smoothedMinus = commit
            ? this.minus.push(minusMovement)
            : this.minus.preview(minusMovement);
        const smoothedRange = commit
            ? this.trueRange.push(trueRange)
            : this.trueRange.preview(trueRange);
        if (commit) this.previousCandle = current;

        if (smoothedPlus === null || smoothedMinus === null || smoothedRange === null) {
            return { plusDI: null, minusDI: null, dx: null };
        }
        // Same as the batch calc: a zero smoothed range reports no direction, it does not withhold
        // a reading. Keeping the two in step is the point -- nothing else compares them on flat data.
        const plusDI = smoothedRange === 0 ? 0 : 100 * smoothedPlus / smoothedRange;
        const minusDI = smoothedRange === 0 ? 0 : 100 * smoothedMinus / smoothedRange;
        const sum = plusDI + minusDI;
        return {
            plusDI,
            minusDI,
            dx: sum === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / sum,
        };
    }

    reset(): void {
        this.previousCandle = null;
        this.plus.reset();
        this.minus.reset();
        this.trueRange.reset();
    }

    checkpoint(): DirectionalMovementCheckpoint {
        return Object.freeze({
            previousCandle: this.previousCandle === null
                ? null
                : Object.freeze({ ...this.previousCandle }),
            plus: this.plus.checkpoint(),
            minus: this.minus.checkpoint(),
            trueRange: this.trueRange.checkpoint(),
        });
    }

    restore(state: DirectionalMovementCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid directional movement checkpoint');
        const previous = state.previousCandle;
        if (previous !== null && (previous === undefined || typeof previous !== 'object'
            || finite(previous.high) === null || finite(previous.low) === null
            || finite(previous.close) === null)) {
            throw new TypeError('sschart: invalid directional movement checkpoint');
        }
        this.plus.restore(state.plus);
        this.minus.restore(state.minus);
        this.trueRange.restore(state.trueRange);
        this.previousCandle = previous === null ? null : Object.freeze({ ...previous });
    }
}
