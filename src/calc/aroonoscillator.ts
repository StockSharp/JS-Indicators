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

export class AroonOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AroonCheckpoint
> {
    private readonly aroon: AroonKernel;

    constructor(readonly length: number) {
        super(['line']);
        this.aroon = new AroonKernel(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const aroon = commit
            ? this.aroon.push(high, low)
            : this.aroon.preview(high, low);
        const value = aroon.up === null || aroon.down === null
            ? null
            : aroon.up - aroon.down;
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.aroon.reset(); }
    protected captureState(): AroonCheckpoint { return this.aroon.checkpoint(); }
    protected restoreState(state: AroonCheckpoint): void { this.aroon.restore(state); }
}

export const AroonOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'AroonOscillator',
    name: 'Aroon Oscillator',
    description: 'Difference between Aroon Up and Aroon Down on one shared state.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{ id: 'line', name: 'Aroon Oscillator', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['aroonoscillator'],
    scaleRange: { min: -100, max: 100 },
    levels: [-50, 0, 50],
    processorFactory: (parameters) => new AroonOscillatorProcessor(
        length(parameters?.length, 14),
    ),
});
