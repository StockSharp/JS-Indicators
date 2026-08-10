import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    PRICE_LINE_STYLE,
} from './shared/cumulative-price.js';
import {
    finite,
} from './shared/guards.js';

export class MedianPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const value = high === null || low === null ? null : (high + low) / 2;
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* stateless */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null)
            throw new TypeError('sschart: invalid Median Price checkpoint');
    }
}

export const MedianPriceIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'MedianPrice',
    name: 'Median Price',
    description: 'Midpoint of each candle high-low range.',
    category: IndicatorCategory.Price,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Median Price', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['medianprice'],
    processorFactory: () => new MedianPriceProcessor(),
});
