import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
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
    RollingStandardDeviation,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    parameter,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface VariableMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly volatilityIndex: number;
}

export interface VariableMovingAverageCheckpoint {
    readonly initialized: boolean;
    readonly deviation: RollingWindowCheckpoint;
    readonly prices: RingBufferCheckpoint<number>;
    readonly previous: number;
}

export class VariableMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VariableMovingAverageCheckpoint
> {
    private initialized = false;
    private readonly deviation: RollingStandardDeviation;
    private readonly prices: RingBuffer<number>;
    private priceSum = 0;
    private previous = 0;

    constructor(
        readonly length: number,
        readonly volatilityIndex: number,
    ) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        parameter(volatilityIndex, volatilityIndex, 0.0001, 10, 'volatilityIndex');
        this.deviation = new RollingStandardDeviation(length);
        this.prices = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null) {
            return {
                isFormed: this.deviation.isFormed,
                values: [this.output('line', null, input.index)],
            };
        }
        if (!this.initialized) {
            if (commit) {
                this.initialized = true;
                this.prices.push(close);
                this.priceSum = close;
                this.previous = close;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const deviation = commit
            ? this.deviation.push(close)
            : this.deviation.preview(close);
        if (deviation === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const averagePrice = this.priceSum / this.prices.size;
        const variableIndex = averagePrice === 0
            ? 0
            : Math.abs(deviation / averagePrice);
        const smoothing = 2
            / (this.length * (1 + this.volatilityIndex * variableIndex) + 1);
        const value = (close - this.previous) * smoothing + this.previous;
        if (commit) {
            if (this.prices.full) this.priceSum -= this.prices.front()!;
            this.prices.push(close);
            this.priceSum += close;
            this.previous = value;
        }
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.deviation.reset();
        this.prices.clear();
        this.priceSum = 0;
        this.previous = 0;
    }

    protected captureState(): VariableMovingAverageCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            deviation: this.deviation.checkpoint(),
            prices: this.prices.checkpoint(),
            previous: this.previous,
        });
    }

    protected restoreState(state: VariableMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || finite(state.previous) === null
            || !Array.isArray(state.deviation?.values)
            || !Array.isArray(state.prices?.values)
            || state.deviation.values.length > this.length
            || state.prices.values.length > this.length
            || state.deviation.values.some((value) => finite(value) === null)
            || state.prices.values.some((value) => finite(value) === null)
            || (!state.initialized && (
                state.deviation.values.length !== 0
                || state.prices.values.length !== 0
                || state.previous !== 0
            ))
            || (state.initialized && state.prices.values.length === 0)) {
            throw new TypeError('sschart: invalid Variable Moving Average checkpoint');
        }
        this.deviation.restore(state.deviation);
        this.prices.restore(state.prices);
        this.initialized = state.initialized;
        this.priceSum = state.prices.values.reduce((sum, value) => sum + value, 0);
        this.previous = state.previous;
    }
}

export const VariableMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    VariableMovingAverageParameters
> = registerIndicator({
    id: 'VariableMovingAverage',
    name: 'Variable Moving Average',
    description: 'EMA-like average whose smoothing decreases as relative volatility rises.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 20, min: 1, max: 500, step: 1,
        },
        {
            id: 'volatilityIndex', name: 'Volatility Index',
            type: IndicatorParameterType.Number,
            defaultValue: 0.2, min: 0.0001, max: 10, step: 0.001,
        },
    ],
    outputs: [{
        id: 'line', name: 'VMA',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#42a5f5',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['vma', 'variablemovingaverage'],
    processorFactory: (parameters) => new VariableMovingAverageProcessor(
        integer(parameters?.length, 20, 1, 500, 'length'),
        parameter(parameters?.volatilityIndex, 0.2, 0.0001, 10, 'volatilityIndex'),
    ),
});
