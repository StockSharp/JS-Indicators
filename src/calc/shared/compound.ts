// Shared by the compound indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    IndicatorSeriesStyle,
    type IndicatorParameters,
} from '../../indicator-definition.js';
import {
    RingBuffer,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../../math/index.js';
import {
    finite,
    integer,
} from './guards.js';

export function style(series: IndicatorSeriesStyle, color: string, lineWidth = 1) {
    return {
        series,
        color,
        lineWidth,
        options: { priceLineVisible: false },
    } as const;
}

export const RIBBON_COLORS = Object.freeze([
    '#42a5f5', '#26c6da', '#26a69a', '#66bb6a', '#d4e157',
    '#ffca28', '#ffa726', '#ff7043', '#ef5350', '#ab47bc',
]);

export interface BollingerBandsCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly deviation: RollingWindowCheckpoint;
}

export interface DonchianChannelsCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export interface FiniteExponentialCheckpoint {
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}

export class FiniteExponentialAverage {
    // The seed values themselves, not just their sum: a warm-up preview has to answer with the
    // oldest one already dropped, which a running total cannot be asked for.
    private readonly seed: RingBuffer<number>;
    private seedSum = 0;
    private previous = 0;
    private readonly multiplier: number;

    constructor(readonly length: number) {
        integer(length, length, 1, 10_000, 'EMA length');
        this.seed = new RingBuffer(length);
        this.multiplier = 2 / (length + 1);
    }

    get isFormed(): boolean { return this.seed.full; }

    push(value: number | null): number | null {
        if (value === null) return null;
        if (!this.seed.full) {
            this.seed.push(value);
            this.seedSum += value;
            this.previous = this.seedSum / this.length;
            return this.previous;
        }
        this.previous = (value - this.previous) * this.multiplier + this.previous;
        return this.previous;
    }

    preview(value: number | null): number | null {
        if (value === null) return null;
        if (!this.seed.full) return (this.seedNoOldest() + value) / this.length;
        return (value - this.previous) * this.multiplier + this.previous;
    }

    reset(): void {
        this.seed.clear();
        this.seedSum = 0;
        this.previous = 0;
    }

    checkpoint(): FiniteExponentialCheckpoint {
        return Object.freeze({
            seed: this.seed.checkpoint(),
            previous: this.previous,
        });
    }

    restore(state: FiniteExponentialCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.seed?.values)
            || state.seed.values.length > this.length
            || state.seed.values.some((seeded) => finite(seeded) === null)
            || finite(state.previous) === null) {
            throw new TypeError('sschart: invalid finite EMA checkpoint');
        }
        this.seed.restore(state.seed);
        this.seedSum = state.seed.values.reduce((sum, seeded) => sum + seeded, 0);
        this.previous = state.previous;
    }

    /** StockSharp's `Buffer.SumNoFirst`: zero for an empty window, the oldest dropped otherwise. */
    private seedNoOldest(): number {
        return this.seed.size === 0 ? 0 : this.seedSum - (this.seed.front() as number);
    }
}

export interface CompoundLengthParameters extends IndicatorParameters {
    readonly length: number;
}

export interface MacdCheckpoint {
    readonly fast: FiniteExponentialCheckpoint;
    readonly slow: FiniteExponentialCheckpoint;
    readonly signal: FiniteExponentialCheckpoint;
}

export interface MacdEvaluation {
    readonly macd: number | null;
    readonly signal: number | null;
    readonly histogram: number | null;
}

export class MacdKernel {
    private readonly fast: FiniteExponentialAverage;
    private readonly slow: FiniteExponentialAverage;
    private readonly signal: FiniteExponentialAverage;

    constructor(fastLength: number, slowLength: number, signalLength: number) {
        this.fast = new FiniteExponentialAverage(fastLength);
        this.slow = new FiniteExponentialAverage(slowLength);
        this.signal = new FiniteExponentialAverage(signalLength);
    }

    get macdIsFormed(): boolean { return this.slow.isFormed; }
    get signalIsFormed(): boolean { return this.signal.isFormed; }

    push(value: number | null): MacdEvaluation { return this.evaluate(value, true); }
    preview(value: number | null): MacdEvaluation { return this.evaluate(value, false); }

    reset(): void {
        this.fast.reset();
        this.slow.reset();
        this.signal.reset();
    }

    checkpoint(): MacdCheckpoint {
        return Object.freeze({
            fast: this.fast.checkpoint(),
            slow: this.slow.checkpoint(),
            signal: this.signal.checkpoint(),
        });
    }

    restore(state: MacdCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid MACD checkpoint');
        this.fast.restore(state.fast);
        this.slow.restore(state.slow);
        this.signal.restore(state.signal);
    }

    private evaluate(value: number | null, commit: boolean): MacdEvaluation {
        const fast = commit ? this.fast.push(value) : this.fast.preview(value);
        const slow = commit ? this.slow.push(value) : this.slow.preview(value);
        const macd = fast === null || slow === null ? null : fast - slow;
        // StockSharp's sequence-mode complex indicator does not feed the signal
        // average until the MACD (its slow EMA) has formed.
        const signalInput = this.slow.isFormed ? macd : null;
        const signal = commit
            ? this.signal.push(signalInput)
            : this.signal.preview(signalInput);
        const histogram = macd === null || signal === null ? null : macd - signal;
        return { macd, signal, histogram };
    }
}
