import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    BufferedPriceProcessor,
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export class MomentumProcessor extends BufferedPriceProcessor {
    constructor(length: number) { super(length, 'line'); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const past = commit && this.prices.full ? this.prices.at(1) : this.past();
        const formed = commit
            ? this.prices.size >= this.length
            : this.prices.size > this.length;
        const value = close !== null && typeof past === 'number'
            ? close - past
            : null;
        if (commit) this.prices.push(close);
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }
}

export const MomentumIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'Momentum',
    name: 'Momentum',
    description: 'Difference between the current close and the close N valid samples ago.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(5)],
    outputs: [{ id: 'line', name: 'Momentum', defaultStyle: lineStyle('#ffb74d') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['momentum'],
    levels: [0],
    processorFactory: (parameters) => new MomentumProcessor(resolvedLength(parameters, 5)),
});
