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
    SimpleMovingAverage,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    CycleLengthParameters,
} from './shared/cycle.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface DetrendedPriceOscillatorCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly history: RingBufferCheckpoint<number | null>;
}

export class DetrendedPriceOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DetrendedPriceOscillatorCheckpoint
> {
    private readonly average: SimpleMovingAverage;
    private readonly history: RingBuffer<number | null>;
    private readonly lookBack: number;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: DPO length must be a positive integer');
        this.average = new SimpleMovingAverage(length);
        this.history = new RingBuffer(length);
        this.lookBack = Math.floor(length / 2) + 1;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const average = commit ? this.average.push(close) : this.average.preview(close);
        const averageState = this.average.checkpoint();
        const averageWillForm = commit
            ? this.average.isFormed
            : close !== null
                && averageState.values.length + (averageState.values.length < this.length ? 1 : 0)
                    >= this.length
                && averageState.values.every((value) => value !== null);
        if (commit && averageWillForm && average !== null) this.history.push(average);
        const history = [...this.history.checkpoint().values];
        if (!commit && averageWillForm && average !== null) {
            if (history.length >= this.length) history.shift();
            history.push(average);
        }
        const formed = history.length >= this.length;
        const referenceIndex = Math.max(0, history.length - 1 - this.lookBack);
        const reference = history[referenceIndex];
        const candidate = formed && close !== null && typeof reference === 'number'
            ? close - reference
            : null;
        const value = finite(candidate);
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.average.reset();
        this.history.clear();
    }

    protected captureState(): DetrendedPriceOscillatorCheckpoint {
        return Object.freeze({
            average: this.average.checkpoint(),
            history: this.history.checkpoint(),
        });
    }

    protected restoreState(state: DetrendedPriceOscillatorCheckpoint): void {
        const values = state?.history?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid DPO checkpoint');
        }
        this.average.restore(state.average);
        this.history.restore(state.history);
    }
}

export const DetrendedPriceOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    CycleLengthParameters
> = registerIndicator({
    id: 'DetrendedPriceOscillator',
    name: 'Detrended Price Oscillator',
    description: 'Current close minus a delayed simple moving average.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 3, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'DPO',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ffb74d',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['dpo'],
    levels: [0],
    processorFactory: (parameters) => new DetrendedPriceOscillatorProcessor(
        length(parameters?.length, 3),
    ),
});
