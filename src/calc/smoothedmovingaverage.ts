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
    LENGTH_STYLE,
    LengthIndicatorParameters,
    SmoothedMovingAverageProcessor,
    resolvedLength,
} from './shared/core.js';

export const SmoothedMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'SmoothedMovingAverage',
    name: 'Smoothed Moving Average',
    description: 'Wilder-smoothed closing price seeded by a full-window average.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Seed window and recursive Wilder smoothing length.',
        type: IndicatorParameterType.Integer,
        defaultValue: 32,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'SMMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#7e57c2' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['smma'],
    processorFactory: (parameters) => new SmoothedMovingAverageProcessor(
        resolvedLength(parameters, 32, 1),
    ),
});
