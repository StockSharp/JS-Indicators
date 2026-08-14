import {
    SmoothedMovingAverage,
    type SmoothedMovingAverageCheckpoint,
} from './moving-averages.js';

function finite(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface PartialRelativeStrengthIndexCheckpoint {
    readonly initialized: boolean;
    readonly previous: number | null;
    readonly previousResult: number | null;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}

/**
 * StockSharp RSI value stream, including partial SMMA values during warm-up.
 * The first finite input seeds the prior value and emits null; later finite
 * deltas emit RSI immediately, while `isFormed` tracks the full SMMA length.
 */
export class PartialRelativeStrengthIndex {
    private initialized = false;
    private previous: number | null = null;
    private previousResult: number | null = null;
    private readonly gain: SmoothedMovingAverage;
    private readonly loss: SmoothedMovingAverage;

    constructor(readonly length: number) {
        this.gain = new SmoothedMovingAverage(length);
        this.loss = new SmoothedMovingAverage(length);
    }

    get isFormed(): boolean { return this.gain.isFormed && this.loss.isFormed; }

    push(value: number | null | undefined): number | null {
        return this.evaluate(finite(value), true);
    }

    preview(value: number | null | undefined): number | null {
        return this.evaluate(finite(value), false);
    }

    reset(): void {
        this.initialized = false;
        this.previous = null;
        this.previousResult = null;
        this.gain.reset();
        this.loss.reset();
    }

    checkpoint(): PartialRelativeStrengthIndexCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previous: this.previous,
            previousResult: this.previousResult,
            gain: this.gain.checkpoint(),
            loss: this.loss.checkpoint(),
        });
    }

    restore(state: PartialRelativeStrengthIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previous !== null && finite(state.previous) === null)
            || (state.previousResult !== null && finite(state.previousResult) === null)
            || state.gain?.seed?.values?.length !== state.loss?.seed?.values?.length
            || (!state.initialized
                && (state.previous !== null || state.gain?.seed?.values?.length !== 0))) {
            throw new TypeError('sschart: invalid partial RSI checkpoint');
        }
        const gain = new SmoothedMovingAverage(this.length);
        const loss = new SmoothedMovingAverage(this.length);
        gain.restore(state.gain);
        loss.restore(state.loss);
        this.gain.restore(gain.checkpoint());
        this.loss.restore(loss.checkpoint());
        this.initialized = state.initialized;
        this.previous = state.previous;
        this.previousResult = state.previousResult;
    }

    private evaluate(value: number | null, commit: boolean): number | null {
        if (!this.initialized) {
            if (commit && value !== null) {
                this.initialized = true;
                this.previous = value;
            }
            return null;
        }

        const delta = value === null || this.previous === null
            ? null
            : finite(value - this.previous);
        const gain = commit
            ? this.gain.push(delta === null ? null : Math.max(delta, 0))
            : this.gain.preview(delta === null ? null : Math.max(delta, 0));
        const loss = commit
            ? this.loss.push(delta === null ? null : Math.max(-delta, 0))
            : this.loss.preview(delta === null ? null : Math.max(-delta, 0));
        if (commit) this.previous = value;
        if (gain === null || loss === null) return null;
        const total = gain + loss;
        if (delta === 0 && this.previousResult !== null) return this.previousResult;
        if (total === 0) return this.previousResult ?? 50;
        const result = finite(loss === 0
            ? 100
            : gain === 0
                ? 0
                : Math.max(0, Math.min(100, 100 * gain / total)));
        if (commit) this.previousResult = result;
        return result;
    }
}
