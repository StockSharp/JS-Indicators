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
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class SumProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly sum: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        this.sum = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.sum.push(close(input))
            : this.sum.preview(close(input));
        return {
            isFormed: this.sum.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.sum.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.sum.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.sum.restore(state); }
}

export const SumIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'Sum',
    name: 'Sum',
    description: 'Rolling sum of closing prices over the configured window.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 15, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Sum',
        defaultStyle: { ...LENGTH_STYLE, color: '#78909c' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,

    aliases: ['sum'],
    processorFactory: (parameters) => new SumProcessor(
        resolvedLength(parameters, 15, 1),
    ),
});
