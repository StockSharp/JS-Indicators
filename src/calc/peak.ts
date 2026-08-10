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
    ZigZagFamilyProcessor,
    ZigZagParameters,
    lineStyle,
    strictDeviation,
} from './shared/shifted-sparse.js';

export class PeakProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number) { super(deviation, 'high', 'up'); }
}

export const PeakIndicator: IndicatorDefinition<IndicatorCandle, ZigZagParameters>
    = registerIndicator({
        id: 'Peak',
        name: 'Peak',
        description: 'ZigZag up-pivots calculated from candle high prices.',
        category: IndicatorCategory.SupportResistance,
        input: CandlestickIndicatorInput,
        parameters: [{
            id: 'deviation',
            name: 'Deviation',
            type: IndicatorParameterType.Number,
            defaultValue: 0.001,
            min: 0.001,
            max: 0.999,
            step: 0.001,
        }],
        outputs: [{ id: 'value', name: 'Peak', defaultStyle: lineStyle('#32CD32') }],
        naturalPane: IndicatorPane.Overlay,
        measure: IndicatorMeasure.Price,
        aliases: ['peak'],
        processorFactory: (parameters) => new PeakProcessor(
            strictDeviation(parameters?.deviation),
        ),
    });
