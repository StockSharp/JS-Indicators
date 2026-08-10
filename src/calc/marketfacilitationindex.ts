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
    lineStyle,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export class MarketFacilitationIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    null
> {
    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const volume = finite(input.value?.volume);
        const value = high === null || low === null || volume === null || volume === 0
            ? null
            : finite((high - low) / volume);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* stateless */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null)
            throw new TypeError('sschart: invalid Market Facilitation Index checkpoint');
    }
}

export const MarketFacilitationIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'MarketFacilitationIndex',
    name: 'Market Facilitation Index',
    description: 'Candle high-low range per unit of traded volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'line',
        name: 'Market Facilitation Index',
        defaultStyle: lineStyle('#66bb6a'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['marketfacilitationindex'],
    processorFactory: () => new MarketFacilitationIndexProcessor(),
});
