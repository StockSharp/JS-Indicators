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

export class TroughProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number) { super(deviation, 'low', 'down'); }
}

export const TroughIndicator: IndicatorDefinition<IndicatorCandle, ZigZagParameters>
    = registerIndicator({
        id: 'Trough',
        name: 'Trough',
        description: 'ZigZag down-pivots calculated from candle low prices.',
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
        outputs: [{ id: 'value', name: 'Trough', defaultStyle: lineStyle('#FF3D57') }],
        naturalPane: IndicatorPane.Overlay,
        measure: IndicatorMeasure.Price,
        aliases: ['trough'],
        processorFactory: (parameters) => new TroughProcessor(
            strictDeviation(parameters?.deviation),
        ),
    });
