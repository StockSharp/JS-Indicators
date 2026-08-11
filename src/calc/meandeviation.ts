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
    RollingMeanDeviation,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class MeanDeviationProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly deviation: RollingMeanDeviation;

    constructor(readonly length: number) {
        super(['line']);
        this.deviation = new RollingMeanDeviation(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.deviation.push(close(input))
            : this.deviation.preview(close(input));
        return {
            isFormed: this.deviation.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.deviation.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.deviation.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void {
        this.deviation.restore(state);
    }
}

export const MeanDeviationIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'MeanDeviation',
    name: 'Mean Deviation',
    description: 'Mean absolute deviation from the mean of a rolling close-price window.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Number of closing prices in the deviation window.',
        type: IndicatorParameterType.Integer,
        defaultValue: 5,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Mean Deviation',
        defaultStyle: { ...LENGTH_STYLE, color: '#7e57c2' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['meandeviation'],
    processorFactory: (parameters) => new MeanDeviationProcessor(
        resolvedLength(parameters, 5, 1),
    ),
});
