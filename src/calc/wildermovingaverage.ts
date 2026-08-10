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
    WilderMovingAverage,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    SmoothedMovingAverageProcessor,
    resolvedLength,
} from './shared/core.js';

/** Public Wilder indicator shares the same seeded recursion as batch SMMA. */
export class WilderMovingAverageProcessor extends SmoothedMovingAverageProcessor {}

export const WilderMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'WilderMovingAverage',
    name: 'Wilder Moving Average',
    description: 'Welles Wilder moving average seeded by a full-window mean.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Seed window and recursive smoothing length.',
        type: IndicatorParameterType.Integer,
        defaultValue: 32,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Wilder MA',
        defaultStyle: { ...LENGTH_STYLE, color: '#ef5350' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['wilderma', 'wildermovingaverage'],
    processorFactory: (parameters) => new WilderMovingAverageProcessor(
        resolvedLength(parameters, 32, 1),
    ),
});
