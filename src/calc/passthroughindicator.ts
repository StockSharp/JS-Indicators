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

export class PassThroughIndicatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    null
> {
    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const value = finite(input.value?.close);
        return {
            isFormed: _commit,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* stateless */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null)
            throw new TypeError('sschart: invalid Pass Through Indicator checkpoint');
    }
}

export const PassThroughIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'PassThroughIndicator',
    name: 'Pass Through Indicator',
    description: 'Returns the candle close unchanged for each input bar.',
    category: IndicatorCategory.Price,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Close', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['passthrough'],
    processorFactory: () => new PassThroughIndicatorProcessor(),
});
