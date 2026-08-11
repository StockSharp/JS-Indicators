import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    type IndicatorCandle,
    type IndicatorDefinition,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    HighestProcessor,
    LENGTH_STYLE,
    LengthIndicatorParameters,
    resolvedLength,
} from './shared/core.js';

export const HighestIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'Highest',
    name: 'Highest',
    description: 'Highest candle close in the configured trailing window.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 5, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Highest',
        defaultStyle: { ...LENGTH_STYLE, color: '#26a69a' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['highest'],
    processorFactory: (parameters) => new HighestProcessor(
        resolvedLength(parameters, 5, 1),
    ),
});
