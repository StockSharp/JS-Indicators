import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    MomentumLengthParameters,
    RelativeStrengthIndexProcessor,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';

export const RelativeStrengthIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'RelativeStrengthIndex',
    name: 'RSI',
    description: 'Wilder relative strength oscillator of average gains and losses.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(15, 1)],
    outputs: [{
        id: 'oscillator',
        name: 'RSI',
        defaultStyle: lineStyle('#42a5f5'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['rsi'],
    scaleRange: { min: 0, max: 100 },
    levels: [30, 70],
    processorFactory: (parameters) => new RelativeStrengthIndexProcessor(
        resolvedLength(parameters, 15, 1),
    ),
});
