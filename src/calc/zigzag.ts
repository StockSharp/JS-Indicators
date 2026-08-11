import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    ZigZagFamilyProcessor,
    ZigZagParameters,
} from './shared/shifted-sparse.js';

export class ZigZagProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number) { super(deviation, 'close', 'both'); }
}

export function zigZagDeviation(value: unknown): number {
    const resolved = value ?? 0.05;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved))
        throw new RangeError('sschart: indicator deviation must be finite between 0 and 1');
    if (!(resolved > 0 && resolved < 1))
        throw new RangeError('sschart: indicator deviation must be finite between 0 and 1');
    return resolved;
}

export const ZigZagIndicator: IndicatorDefinition<
    IndicatorCandle,
    ZigZagParameters
> = registerIndicator({
        id: 'ZigZag',
        name: 'ZigZag',
        description: 'Close-price reversal pivots placed on their shifted extremum candles.',
        category: IndicatorCategory.SupportResistance,
        input: CandlestickIndicatorInput,
        parameters: [{
            id: 'deviation',
            name: 'Deviation',
            type: IndicatorParameterType.Number,
            defaultValue: 0.001,
            min: 0.001,
            max: 0.5,
            step: 0.001,
        }],
        outputs: [{
            id: 'value',
            name: 'ZigZag',
            defaultStyle: {
                series: IndicatorSeriesStyle.Markers,
                color: '#FFD54F',
                options: { pointMarkersRadius: 4 },
            },
        }],
        naturalPane: IndicatorPane.Overlay,
        measure: IndicatorMeasure.Price,
        aliases: ['zigzag'],
        processorFactory: (parameters) => new ZigZagProcessor(
            zigZagDeviation(parameters?.deviation),
        ),
    });
