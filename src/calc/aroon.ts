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
    AroonCheckpoint,
    AroonKernel,
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
    number,
} from './shared/guards.js';

export class AroonProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AroonCheckpoint
> {
    private readonly aroon: AroonKernel;

    constructor(readonly length: number) {
        super(['up', 'down']);
        this.aroon = new AroonKernel(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const value = commit
            ? this.aroon.push(high, low)
            : this.aroon.preview(high, low);
        return {
            isFormed: value.up !== null && value.down !== null,
            values: [
                this.output('up', value.up, input.index),
                this.output('down', value.down, input.index),
            ],
        };
    }

    protected resetState(): void { this.aroon.reset(); }
    protected captureState(): AroonCheckpoint { return this.aroon.checkpoint(); }
    protected restoreState(state: AroonCheckpoint): void { this.aroon.restore(state); }
}

export const AroonIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'Aroon',
    name: 'Aroon',
    description: 'Recency of the latest high and low using StockSharp eviction semantics.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [
        { id: 'up', name: 'Aroon Up', defaultStyle: lineStyle('#00c853') },
        { id: 'down', name: 'Aroon Down', defaultStyle: lineStyle('#ff3d57') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['aroon'],
    scaleRange: { min: 0, max: 100 },
    levels: [30, 70],
    processorFactory: (parameters) => new AroonProcessor(length(parameters?.length, 14)),
});
