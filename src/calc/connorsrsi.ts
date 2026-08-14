import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    RingBuffer,
    SmoothedMovingAverage,
    type RingBufferCheckpoint,
    type SmoothedMovingAverageCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface ConnorsRsiParameters extends IndicatorParameters {
    readonly rsiPeriod: number;
    readonly streakRSIPeriod: number;
    readonly rocRSIPeriod: number;
}

export interface ArrayRsiCheckpoint {
    readonly initialized: boolean;
    readonly previous: number | null;
    readonly previousResult: number | null;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}

export class ArrayRsiKernel {
    private initialized = false;
    private previous: number | null = null;
    private previousResult: number | null = null;
    private readonly gain: SmoothedMovingAverage;
    private readonly loss: SmoothedMovingAverage;

    constructor(readonly length: number) {
        this.gain = new SmoothedMovingAverage(length);
        this.loss = new SmoothedMovingAverage(length);
    }

    push(value: number | null): number | null { return this.evaluate(value, true); }
    preview(value: number | null): number | null { return this.evaluate(value, false); }

    reset(): void {
        this.initialized = false;
        this.previous = null;
        this.previousResult = null;
        this.gain.reset();
        this.loss.reset();
    }

    checkpoint(): ArrayRsiCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previous: this.previous,
            previousResult: this.previousResult,
            gain: this.gain.checkpoint(),
            loss: this.loss.checkpoint(),
        });
    }

    restore(state: ArrayRsiCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previous !== null && finite(state.previous) === null)
            || (state.previousResult !== null && finite(state.previousResult) === null)
            || state.gain?.seed?.values?.length !== state.loss?.seed?.values?.length
            || (!state.initialized
                && (state.previous !== null || state.gain.seed.values.length !== 0))) {
            throw new TypeError('sschart: invalid array RSI checkpoint');
        }
        this.gain.restore(state.gain);
        this.loss.restore(state.loss);
        this.initialized = state.initialized;
        this.previous = state.previous;
        this.previousResult = state.previousResult;
    }

    private evaluate(value: number | null, commit: boolean): number | null {
        if (!this.initialized) {
            if (value !== null && commit) {
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

export interface ConnorsRsiCheckpoint {
    readonly closeRsi: ArrayRsiCheckpoint;
    readonly streakRsi: ArrayRsiCheckpoint;
    readonly rocRsi: ArrayRsiCheckpoint;
    readonly rocHistory: RingBufferCheckpoint<number | null>;
    readonly streakPreviousPrice: number | null;
    readonly streakPrevious: number;
}

export class ConnorsRsiProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ConnorsRsiCheckpoint
> {
    private readonly closeRsi: ArrayRsiKernel;
    private readonly streakRsi: ArrayRsiKernel;
    private readonly rocRsi: ArrayRsiKernel;
    private readonly rocHistory: RingBuffer<number | null>;
    private streakPreviousPrice: number | null = null;
    private streakPrevious = 0;

    constructor(
        readonly rsiPeriod: number,
        readonly streakRSIPeriod: number,
        readonly rocRSIPeriod: number,
    ) {
        super(['rsi', 'updown', 'rocrsi', 'crsi']);
        for (const [name, value] of [
            ['RSI', rsiPeriod],
            ['streak RSI', streakRSIPeriod],
            ['ROC RSI', rocRSIPeriod],
        ] as const) {
            if (!Number.isInteger(value) || value < 1)
                throw new RangeError(`sschart: Connors ${name} length must be positive`);
        }
        this.closeRsi = new ArrayRsiKernel(rsiPeriod);
        this.streakRsi = new ArrayRsiKernel(streakRSIPeriod);
        this.rocRsi = new ArrayRsiKernel(rocRSIPeriod);
        this.rocHistory = new RingBuffer(rocRSIPeriod + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const rsi = commit ? this.closeRsi.push(close) : this.closeRsi.preview(close);

        let streak: number | null = null;
        if (close !== null) {
            if (this.streakPreviousPrice === null) streak = 1;
            else if (close > this.streakPreviousPrice)
                streak = this.streakPrevious > 0 ? this.streakPrevious + 1 : 1;
            else if (close < this.streakPreviousPrice)
                streak = this.streakPrevious < 0 ? this.streakPrevious - 1 : -1;
            else streak = 0;
        }
        const updown = commit
            ? this.streakRsi.push(streak)
            : this.streakRsi.preview(streak);
        if (commit && streak !== null && close !== null) {
            this.streakPreviousPrice = close;
            this.streakPrevious = streak;
        }

        // ROC divides by `Buffer[0]`, and Momentum pushes on a final input only: a preview reads
        // the committed buffer whole, so its base sits one slot further back than a commit leaves.
        let base: number | null | undefined;
        if (this.rocHistory.size === 0) base = close;
        else if (!commit || this.rocHistory.size <= this.rocRSIPeriod)
            base = this.rocHistory.front();
        else base = this.rocHistory.at(this.rocHistory.size - this.rocRSIPeriod);
        const roc = close !== null && typeof base === 'number' && base !== 0
            ? finite((close - base) / base * 100)
            : null;
        const rocrsi = commit ? this.rocRsi.push(roc) : this.rocRsi.preview(roc);
        if (commit) this.rocHistory.push(close);

        const formedAt = Math.max(this.rsiPeriod, this.streakRSIPeriod, this.rocRSIPeriod);
        const formed = input.index >= formedAt
            && rsi !== null && updown !== null && rocrsi !== null;
        const crsi = formed ? finite((rsi + updown + rocrsi) / 3) : null;
        return {
            isFormed: commit && formed,
            values: [
                this.output('rsi', formed ? rsi : null, input.index),
                this.output('updown', formed ? updown : null, input.index),
                this.output('rocrsi', formed ? rocrsi : null, input.index),
                this.output('crsi', crsi, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.closeRsi.reset();
        this.streakRsi.reset();
        this.rocRsi.reset();
        this.rocHistory.clear();
        this.streakPreviousPrice = null;
        this.streakPrevious = 0;
    }

    protected captureState(): ConnorsRsiCheckpoint {
        return Object.freeze({
            closeRsi: this.closeRsi.checkpoint(),
            streakRsi: this.streakRsi.checkpoint(),
            rocRsi: this.rocRsi.checkpoint(),
            rocHistory: this.rocHistory.checkpoint(),
            streakPreviousPrice: this.streakPreviousPrice,
            streakPrevious: this.streakPrevious,
        });
    }

    protected restoreState(state: ConnorsRsiCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.streakPreviousPrice !== null && finite(state.streakPreviousPrice) === null)
            || finite(state.streakPrevious) === null) {
            throw new TypeError('sschart: invalid Connors RSI checkpoint');
        }
        this.closeRsi.restore(state.closeRsi);
        this.streakRsi.restore(state.streakRsi);
        this.rocRsi.restore(state.rocRsi);
        this.rocHistory.restore(state.rocHistory);
        this.streakPreviousPrice = state.streakPreviousPrice;
        this.streakPrevious = state.streakPrevious;
    }
}

export const ConnorsRsiIndicator: IndicatorDefinition<
    IndicatorCandle,
    ConnorsRsiParameters
> = registerIndicator({
    id: 'ConnorsRSI',
    name: 'Connors RSI',
    description: 'Composite of close RSI, streak RSI and RSI of long-period ROC.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'rsiPeriod', name: 'RSI Length', type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
        },
        {
            id: 'streakRSIPeriod', name: 'Streak RSI Length', type: IndicatorParameterType.Integer,
            defaultValue: 2, min: 1, max: 500, step: 1,
        },
        {
            id: 'rocRSIPeriod', name: 'ROC RSI Length', type: IndicatorParameterType.Integer,
            defaultValue: 100, min: 1, max: 1_000, step: 1,
        },
    ],
    outputs: [
        { id: 'rsi', name: 'RSI', defaultStyle: lineStyle('#42a5f5') },
        { id: 'updown', name: 'Up/Down RSI', defaultStyle: lineStyle('#ffb74d') },
        { id: 'rocrsi', name: 'ROC RSI', defaultStyle: lineStyle('#ab47bc') },
        { id: 'crsi', name: 'Connors RSI', defaultStyle: lineStyle('#26a69a') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['connorsrsi'],
    scaleRange: { min: 0, max: 100 },
    levels: [10, 90],
    processorFactory: (parameters) => new ConnorsRsiProcessor(
        resolvedPeriod(
            parameters?.rsiPeriod ?? parameters?.rSIPeriod ?? parameters?.rsiperiod,
            3,
            'rsiPeriod',
        ),
        resolvedPeriod(parameters?.streakRSIPeriod, 2, 'streakRSIPeriod'),
        resolvedPeriod(
            parameters?.rocRSIPeriod ?? parameters?.rOCRSIPeriod ?? parameters?.rocrsiperiod,
            100,
            'rocRSIPeriod',
            1_000,
        ),
    ),
});
