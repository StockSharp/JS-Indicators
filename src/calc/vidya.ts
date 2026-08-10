import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    RingBuffer,
    RollingSum,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    AdaptiveLengthParameters,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface VidyaCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}

export class VidyaProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VidyaCheckpoint
> {
    private initialized = false;
    private previousClose: number | null = null;
    private readonly up: RollingSum;
    private readonly down: RollingSum;
    private readonly seed: RingBuffer<number>;
    private seedSum = 0;
    private previous = 0;
    private readonly multiplier: number;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        this.up = new RollingSum(length);
        this.down = new RollingSum(length);
        this.seed = new RingBuffer(length);
        this.multiplier = 2 / (length + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null) {
            return {
                isFormed: this.seed.full,
                values: [this.output('line', null, input.index)],
            };
        }
        if (!this.initialized) {
            if (commit) {
                this.initialized = true;
                this.previousClose = close;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const delta = close - this.previousClose!;
        const up = Math.max(delta, 0);
        const down = Math.max(-delta, 0);
        const upSum = commit ? this.up.push(up) : this.up.preview(up);
        const downSum = commit ? this.down.push(down) : this.down.preview(down);
        if (commit) this.previousClose = close;
        if (upSum === null || downSum === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const total = upSum + downSum;
        const cmo = total === 0 ? 0 : 100 * (upSum - downSum) / total;
        if (!this.seed.full) {
            const value = (this.seedSum + close) / this.length;
            const formed = this.seed.size + 1 >= this.length;
            if (commit) {
                this.seed.push(close);
                this.seedSum += close;
                this.previous = value;
            }
            return {
                isFormed: formed,
                values: [this.output('line', formed ? value : null, input.index)],
            };
        }

        const value = (close - this.previous)
            * this.multiplier * Math.abs(cmo / 100) + this.previous;
        if (commit) this.previous = value;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.previousClose = null;
        this.up.reset();
        this.down.reset();
        this.seed.clear();
        this.seedSum = 0;
        this.previous = 0;
    }

    protected captureState(): VidyaCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previousClose: this.previousClose,
            up: this.up.checkpoint(),
            down: this.down.checkpoint(),
            seed: this.seed.checkpoint(),
            previous: this.previous,
        });
    }

    protected restoreState(state: VidyaCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || finite(state.previous) === null
            || !Array.isArray(state.up?.values) || !Array.isArray(state.down?.values)
            || !Array.isArray(state.seed?.values)
            || state.up.values.length !== state.down.values.length
            || state.up.values.length > this.length
            || state.seed.values.length > this.length
            || state.up.values.some((value) => finite(value) === null || value < 0)
            || state.down.values.some((value) => finite(value) === null || value < 0)
            || state.seed.values.some((value) => finite(value) === null)
            || (!state.initialized && (
                state.previousClose !== null
                || state.up.values.length !== 0
                || state.seed.values.length !== 0
                || state.previous !== 0
            ))
            || (state.initialized && state.previousClose === null)
            || (state.seed.values.length > 0 && state.up.values.length < this.length)
            || (state.seed.values.length === 0 && state.previous !== 0)) {
            throw new TypeError('sschart: invalid VIDYA checkpoint');
        }
        this.up.restore(state.up);
        this.down.restore(state.down);
        this.seed.restore(state.seed);
        this.initialized = state.initialized;
        this.previousClose = state.previousClose;
        this.seedSum = state.seed.values.reduce((sum, value) => sum + value, 0);
        this.previous = state.previous;
    }
}

export const VidyaIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptiveLengthParameters
> = registerIndicator({
    id: 'Vidya',
    name: 'VIDYA',
    description: 'Chande variable-index dynamic average driven by absolute momentum.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 15, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'VIDYA',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#26a69a',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['vidya'],
    processorFactory: (parameters) => new VidyaProcessor(
        integer(parameters?.length, 15, 1, 500, 'length'),
    ),
});
