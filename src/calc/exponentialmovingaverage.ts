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
    ExponentialMovingAverage,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class ExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SeededMovingAverageCheckpoint
> {
    private readonly average: ExponentialMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new ExponentialMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.average.push(close(input))
            : this.average.preview(close(input));
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): SeededMovingAverageCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: SeededMovingAverageCheckpoint): void { this.average.restore(state); }
}

export const ExponentialMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'ExponentialMovingAverage',
    name: 'EMA',
    description: 'Exponentially weighted moving average seeded by a full-window SMA.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'SMA seed and exponential smoothing length.',
        type: IndicatorParameterType.Integer,
        defaultValue: 32,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'EMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#26a69a' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['ema'],
    processorFactory: (parameters) => new ExponentialMovingAverageProcessor(
        resolvedLength(parameters, 32, 1),
    ),
});
