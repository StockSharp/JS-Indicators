// Shared by the range indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    IndicatorSeriesStyle,
    type IndicatorParameters,
} from '../../indicator-definition.js';
import {
    RingBuffer,
} from '../../math/index.js';
import {
    finite,
    length,
} from './guards.js';

export interface RangeLengthParameters extends IndicatorParameters {
    readonly length: number;
}

export interface AroonCheckpoint {
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly maximum: number;
    readonly maximumAge: number;
    readonly minimum: number;
    readonly minimumAge: number;
}

export interface AroonValue {
    readonly up: number | null;
    readonly down: number | null;
}

export function lineStyle(color: string, lineWidth = 2) {
    return {
        series: IndicatorSeriesStyle.Line,
        color,
        lineWidth,
        options: { priceLineVisible: false },
    } as const;
}

export /** Exact bounded-state port of StockSharp Aroon's eviction/rescan semantics. */
class AroonKernel {
    private readonly highs: RingBuffer<number>;
    private readonly lows: RingBuffer<number>;
    private maximum = -Infinity;
    private maximumAge = 0;
    private minimum = Infinity;
    private minimumAge = 0;

    constructor(readonly windowLength: number) {
        length(windowLength, windowLength);
        this.highs = new RingBuffer(windowLength);
        this.lows = new RingBuffer(windowLength);
    }

    push(high: number | null, low: number | null): AroonValue {
        return this.evaluate(high, low, true);
    }

    preview(high: number | null, low: number | null): AroonValue {
        return this.evaluate(high, low, false);
    }

    reset(): void {
        this.highs.clear();
        this.lows.clear();
        this.maximum = -Infinity;
        this.maximumAge = 0;
        this.minimum = Infinity;
        this.minimumAge = 0;
    }

    checkpoint(): AroonCheckpoint {
        return Object.freeze({
            highs: Object.freeze(this.highs.toArray()),
            lows: Object.freeze(this.lows.toArray()),
            maximum: this.maximum,
            maximumAge: this.maximumAge,
            minimum: this.minimum,
            minimumAge: this.minimumAge,
        });
    }

    restore(state: AroonCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.highs) || !Array.isArray(state.lows)
            || state.highs.length !== state.lows.length
            || state.highs.length > this.windowLength
            || !state.highs.every((item) => finite(item) !== null)
            || !state.lows.every((item) => finite(item) !== null)
            || !Number.isInteger(state.maximumAge) || state.maximumAge < 0
            || !Number.isInteger(state.minimumAge) || state.minimumAge < 0
            || (state.highs.length === 0
                ? state.maximum !== -Infinity || state.minimum !== Infinity
                : finite(state.maximum) === null || finite(state.minimum) === null)) {
            throw new TypeError('sschart: invalid Aroon checkpoint');
        }
        this.highs.restore({ values: state.highs });
        this.lows.restore({ values: state.lows });
        this.maximum = state.maximum;
        this.maximumAge = state.maximumAge;
        this.minimum = state.minimum;
        this.minimumAge = state.minimumAge;
    }

    private evaluate(high: number | null, low: number | null, commit: boolean): AroonValue {
        if (high === null || low === null) return { up: null, down: null };

        let maximum = this.maximum;
        let maximumAge = this.maximumAge;
        let minimum = this.minimum;
        let minimumAge = this.minimumAge;

        if (high >= maximum) {
            maximum = high;
            maximumAge = 0;
        } else maximumAge += 1;
        if (low <= minimum) {
            minimum = low;
            minimumAge = 0;
        } else minimumAge += 1;

        const full = this.highs.full;
        if (full) {
            if (this.highs.front() === maximum) {
                maximum = high;
                maximumAge = 0;
                for (let index = 1; index < this.windowLength; index += 1) {
                    const candidate = this.highs.at(index)!;
                    if (candidate > maximum) {
                        maximum = candidate;
                        maximumAge = index;
                    }
                }
            }
            if (this.lows.front() === minimum) {
                minimum = low;
                minimumAge = 0;
                for (let index = 1; index < this.windowLength; index += 1) {
                    const candidate = this.lows.at(index)!;
                    if (candidate < minimum) {
                        minimum = candidate;
                        minimumAge = index;
                    }
                }
            }
        }

        const formed = full || this.highs.size + 1 === this.windowLength;
        if (commit) {
            this.highs.push(high);
            this.lows.push(low);
            this.maximum = maximum;
            this.maximumAge = maximumAge;
            this.minimum = minimum;
            this.minimumAge = minimumAge;
        }
        return formed
            ? {
                up: 100 * (this.windowLength - maximumAge) / this.windowLength,
                down: 100 * (this.windowLength - minimumAge) / this.windowLength,
            }
            : { up: null, down: null };
    }
}
