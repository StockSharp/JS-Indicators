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
    typicalPrice,
} from './shared/cumulative-price.js';

export class TypicalPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const value = typicalPrice(input.value);
        return {
            isFormed: _commit,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* stateless */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null)
            throw new TypeError('sschart: invalid Typical Price checkpoint');
    }
}

export const TypicalPriceIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'TypicalPrice',
    name: 'Typical Price',
    description: 'Per-candle average of high, low and close prices.',
    category: IndicatorCategory.Price,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Typical Price', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['tp', 'typicalprice'],
    processorFactory: () => new TypicalPriceProcessor(),
});
