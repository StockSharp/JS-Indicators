import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class EndpointMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RingBufferCheckpoint<number | null>
> {
    private readonly values: RingBuffer<number | null>;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Endpoint Moving Average length must be an integer from 1 to 500',
            );
        }
        this.values = new RingBuffer<number | null>(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const current = close(input);
        let first: number | null | undefined;

        if (commit) {
            this.values.push(current);
            first = this.values.full ? this.values.front() : undefined;
        } else if (this.length > 1 && this.values.size + 1 >= this.length) {
            first = this.values.full ? this.values.at(1) : this.values.front();
        }

        let value: number | null = null;
        if (this.length > 1 && typeof first === 'number' && current !== null) {
            const slope = (current - first) / (this.length - 1);
            const candidate = first + slope * (this.length - 1);
            value = Number.isFinite(candidate) ? candidate : null;
        }

        return {
            isFormed: this.values.full,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.values.clear(); }
    protected captureState(): RingBufferCheckpoint<number | null> {
        return this.values.checkpoint();
    }
    protected restoreState(state: RingBufferCheckpoint<number | null>): void {
        if (state === null || typeof state !== 'object' || !Array.isArray(state.values)
            || state.values.some((value) => (
                value !== null && (typeof value !== 'number' || !Number.isFinite(value))
            ))) {
            throw new TypeError('sschart: invalid Endpoint Moving Average checkpoint');
        }
        this.values.restore(state);
    }
}

export const EndpointMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'EndpointMovingAverage',
    name: 'Endpoint Moving Average',
    description: 'StockSharp endpoint moving average over a fixed close-price window.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Number of closing prices in the endpoint window.',
        type: IndicatorParameterType.Integer,
        defaultValue: 10,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'EPMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#26c6da' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['endpointma'],
    processorFactory: (parameters) => new EndpointMovingAverageProcessor(
        resolvedLength(parameters, 10, 1),
    ),
});
