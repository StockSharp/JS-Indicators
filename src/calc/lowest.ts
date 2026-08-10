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
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    HighestProcessor,
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class LowestProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly minimum: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        this.minimum = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        // The close, not the bar low — mirror of HighestProcessor.
        const close = input.value?.close;
        const value = commit
            ? this.minimum.push(close)
            : this.minimum.preview(close);
        return {
            isFormed: this.minimum.isFormed || value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.minimum.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.minimum.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void {
        this.minimum.restore(state);
    }
}

export const LowestIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'Lowest',
    name: 'Lowest',
    description: 'Lowest candle close in the configured trailing window.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 5, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Lowest',
        defaultStyle: { ...LENGTH_STYLE, color: '#ef5350' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['lowest'],
    processorFactory: (parameters) => new LowestProcessor(
        resolvedLength(parameters, 5, 1),
    ),
});
