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
import {
    finite,
} from './shared/guards.js';

export interface TimeWeightedAveragePriceCheckpoint {
    readonly sum: number;
    readonly count: number;
}

export class TimeWeightedAveragePriceProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TimeWeightedAveragePriceCheckpoint
> {
    private sum = 0;
    private count = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const typical = typicalPrice(input.value);
        if (typical === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        const sum = this.sum + typical;
        const count = this.count + 1;
        if (commit) {
            this.sum = sum;
            this.count = count;
        }
        return {
            isFormed: true,
            values: [this.output('line', sum / count, input.index)],
        };
    }

    protected resetState(): void {
        this.sum = 0;
        this.count = 0;
    }

    protected captureState(): TimeWeightedAveragePriceCheckpoint {
        return Object.freeze({ sum: this.sum, count: this.count });
    }

    protected restoreState(state: TimeWeightedAveragePriceCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.sum) === null
            || !Number.isInteger(state.count) || state.count < 0
            || (state.count === 0 && state.sum !== 0)) {
            throw new TypeError('sschart: invalid TWAP checkpoint');
        }
        this.sum = state.sum;
        this.count = state.count;
    }
}

export const TimeWeightedAveragePriceIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'TimeWeightedAveragePrice',
    name: 'Time Weighted Average Price',
    description: 'Cumulative average of typical prices from the start of the input session.',
    category: IndicatorCategory.Price,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'TWAP', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['twap', 'timeweightedaverageprice'],
    processorFactory: () => new TimeWeightedAveragePriceProcessor(),
});
