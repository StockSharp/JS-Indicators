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

export interface AccumulationDistributionLineCheckpoint {
    readonly value: number;
}

export class AccumulationDistributionLineProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AccumulationDistributionLineCheckpoint
> {
    private current = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        let value = this.current;
        if (high !== null && low !== null && close !== null && volume !== null) {
            const range = high - low;
            if (range !== 0) {
                const contribution = (((close - low) - (high - close)) / range) * volume;
                if (Number.isFinite(contribution) && Number.isFinite(value + contribution))
                    value += contribution;
            }
        }
        if (commit) this.current = value;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.current = 0; }
    protected captureState(): AccumulationDistributionLineCheckpoint {
        return Object.freeze({ value: this.current });
    }
    protected restoreState(state: AccumulationDistributionLineCheckpoint): void {
        if (state === null || typeof state !== 'object' || finite(state.value) === null)
            throw new TypeError('sschart: invalid ADL checkpoint');
        this.current = state.value;
    }
}

export const AccumulationDistributionLineIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'AccumulationDistributionLine',
    name: 'Accumulation Distribution Line',
    description: 'Cumulative volume-weighted close location within each candle range.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'ADL', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['adl'],
    processorFactory: () => new AccumulationDistributionLineProcessor(),
});
