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
    RollingMedian,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class MedianProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly median: RollingMedian;

    constructor(readonly length: number) {
        super(['line']);
        this.median = new RollingMedian(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.median.push(close(input))
            : this.median.preview(close(input));
        return {
            isFormed: this.median.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.median.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.median.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.median.restore(state); }
}

export const MedianIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'Median',
    name: 'Median',
    description: 'Moving median of a fixed trailing close-price window.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Number of closing prices in the median window.',
        type: IndicatorParameterType.Integer,
        defaultValue: 5,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Median',
        defaultStyle: { ...LENGTH_STYLE, color: '#26a69a' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['median'],
    processorFactory: (parameters) => new MedianProcessor(
        resolvedLength(parameters, 5, 1),
    ),
});
