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
    AverageTrueRange,
    type AverageTrueRangeCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    resolvedLength,
} from './shared/core.js';

export class AverageTrueRangeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AverageTrueRangeCheckpoint
> {
    private readonly average: AverageTrueRange;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new AverageTrueRange(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.average.push(input.value)
            : this.average.preview(input.value);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): AverageTrueRangeCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: AverageTrueRangeCheckpoint): void { this.average.restore(state); }
}

export const AverageTrueRangeIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'AverageTrueRange',
    name: 'Average True Range',
    description: 'Wilder-smoothed true range including overnight price gaps.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Wilder smoothing length.',
        type: IndicatorParameterType.Integer,
        defaultValue: 32,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'ATR',
        defaultStyle: { ...LENGTH_STYLE, color: '#ab47bc' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['atr'],
    processorFactory: (parameters) => new AverageTrueRangeProcessor(
        resolvedLength(parameters, 32, 1),
    ),
});
