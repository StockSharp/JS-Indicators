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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class SimpleMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.average.push(close(input))
            : this.average.preview(close(input));
        return {
            isFormed: this.average.isFormed || value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const SimpleMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'SimpleMovingAverage',
    name: 'SMA',
    description: 'Arithmetic mean of closing prices over a fixed rolling window.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Number of closing prices in the rolling window.',
        type: IndicatorParameterType.Integer,
        defaultValue: 32,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'SMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#f5c542' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['sma'],
    processorFactory: (parameters) => new SimpleMovingAverageProcessor(
        resolvedLength(parameters, 32, 1),
    ),
});
