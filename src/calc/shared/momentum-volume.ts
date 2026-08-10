// Shared by the momentum-volume indicators: parameter shapes, checkpoints and helpers that more than one
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
    RingBuffer,
    SmoothedMovingAverage,
    type RingBufferCheckpoint,
    type SmoothedMovingAverageCheckpoint,
} from '../../math/index.js';
import {
    finite,
} from './guards.js';

export interface MomentumLengthParameters extends IndicatorParameters {
    readonly length: number;
}

export function resolvedLength(
    parameters: MomentumLengthParameters,
    fallback: number,
    minimum = 1,
): number {
    const value = parameters?.length ?? fallback;
    if (!Number.isInteger(value) || value < minimum || value > 500) {
        throw new RangeError(
            `sschart: indicator length must be an integer from ${minimum} to 500`,
        );
    }
    return value;
}

export function resolvedPeriod(value: unknown, fallback: number, name: string, maximum = 500): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || (resolved as number) < 1
        || (resolved as number) > maximum) {
        throw new RangeError(`sschart: ${name} must be an integer from 1 to ${maximum}`);
    }
    return resolved as number;
}

export function lineStyle(color: string) {
    return {
        series: IndicatorSeriesStyle.Line,
        color,
        lineWidth: 2,
        options: { priceLineVisible: false },
    } as const;
}

export function lengthParameter(defaultValue: number, minimum = 1) {
    return {
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue,
        min: minimum,
        max: 500,
        step: 1,
    } as const;
}

export interface RelativeStrengthIndexCheckpoint {
    readonly previousClose: number | null;
    readonly validDeltas: number;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}

export class RelativeStrengthIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RelativeStrengthIndexCheckpoint
> {
    private previousClose: number | null = null;
    private validDeltas = 0;
    private readonly gain: SmoothedMovingAverage;
    private readonly loss: SmoothedMovingAverage;

    constructor(readonly length: number) {
        super(['oscillator']);
        this.gain = new SmoothedMovingAverage(length);
        this.loss = new SmoothedMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const delta = close === null || this.previousClose === null
            ? null
            : close - this.previousClose;
        const averageGain = commit
            ? this.gain.push(delta === null ? null : Math.max(delta, 0))
            : this.gain.preview(delta === null ? null : Math.max(delta, 0));
        const averageLoss = commit
            ? this.loss.push(delta === null ? null : Math.max(-delta, 0))
            : this.loss.preview(delta === null ? null : Math.max(-delta, 0));
        if (commit) {
            this.previousClose = close;
            if (delta !== null) this.validDeltas = Math.min(this.length, this.validDeltas + 1);
        }

        let value: number | null = null;
        const formed = commit
            ? this.validDeltas >= this.length
            : this.validDeltas + (delta === null ? 0 : 1) >= this.length;
        if (formed && averageGain !== null && averageLoss !== null) {
            const total = averageGain + averageLoss;
            value = total === 0 ? 50 : 100 * averageGain / total;
        }
        return {
            isFormed: value !== null,
            values: [this.output('oscillator', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = null;
        this.validDeltas = 0;
        this.gain.reset();
        this.loss.reset();
    }

    protected captureState(): RelativeStrengthIndexCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            validDeltas: this.validDeltas,
            gain: this.gain.checkpoint(),
            loss: this.loss.checkpoint(),
        });
    }

    protected restoreState(state: RelativeStrengthIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || !Number.isInteger(state.validDeltas)
            || state.validDeltas < 0 || state.validDeltas > this.length
            || state.gain?.count !== state.validDeltas
            || state.loss?.count !== state.validDeltas) {
            throw new TypeError('sschart: invalid RSI checkpoint');
        }
        this.gain.restore(state.gain);
        this.loss.restore(state.loss);
        this.previousClose = state.previousClose;
        this.validDeltas = state.validDeltas;
    }
}

export interface PriceBufferCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
}

export abstract class BufferedPriceProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PriceBufferCheckpoint
> {
    protected readonly prices: RingBuffer<number | null>;

    protected constructor(readonly length: number, outputId: string) {
        super([outputId]);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: buffered price length must be a positive integer');
        this.prices = new RingBuffer(length + 1);
    }

    protected past(): number | null | undefined {
        if (this.prices.size < this.length) return undefined;
        return this.prices.at(this.prices.size - this.length);
    }

    protected resetState(): void { this.prices.clear(); }
    protected captureState(): PriceBufferCheckpoint {
        return Object.freeze({ prices: this.prices.checkpoint() });
    }
    protected restoreState(state: PriceBufferCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid buffered price checkpoint');
        this.prices.restore(state.prices);
    }
}

export interface OnBalanceVolumeCheckpoint {
    readonly previousClose: number;
    readonly cumulative: number;
}

export class OnBalanceVolumeKernel {
    private previousClose = 0;
    private cumulative = 0;

    process(candle: Readonly<IndicatorCandle>, commit: boolean): number | null {
        const close = finite(candle?.close);
        const volume = finite(candle?.volume);
        if (close === null || volume === null) return null;

        let value = this.cumulative;
        if (this.previousClose !== 0) {
            if (close > this.previousClose) value += volume;
            else if (close < this.previousClose) value -= volume;
        }
        if (commit) {
            this.previousClose = close;
            this.cumulative = value;
        }
        return value;
    }

    reset(): void {
        this.previousClose = 0;
        this.cumulative = 0;
    }

    checkpoint(): OnBalanceVolumeCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            cumulative: this.cumulative,
        });
    }

    restore(state: OnBalanceVolumeCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null || finite(state.cumulative) === null) {
            throw new TypeError('sschart: invalid OBV checkpoint');
        }
        this.previousClose = state.previousClose;
        this.cumulative = state.cumulative;
    }
}
