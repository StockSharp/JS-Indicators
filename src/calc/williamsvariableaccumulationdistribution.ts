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

export interface WilliamsVariableAccumulationDistributionCheckpoint {
    readonly value: number;
}

export class WilliamsVariableAccumulationDistributionProcessor
    extends SequentialIndicatorProcessor<
        IndicatorCandle,
        WilliamsVariableAccumulationDistributionCheckpoint
    > {
    private current = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        let value = this.current;
        if (open !== null && high !== null && low !== null
            && close !== null && volume !== null) {
            const range = high - low;
            if (range !== 0) {
                const contribution = (close - open) / range * volume;
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
    protected captureState(): WilliamsVariableAccumulationDistributionCheckpoint {
        return Object.freeze({ value: this.current });
    }
    protected restoreState(state: WilliamsVariableAccumulationDistributionCheckpoint): void {
        if (state === null || typeof state !== 'object' || finite(state.value) === null)
            throw new TypeError('sschart: invalid WVAD checkpoint');
        this.current = state.value;
    }
}

export const WilliamsVariableAccumulationDistributionIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'WilliamsVariableAccumulationDistribution',
    name: 'Williams Variable Accumulation Distribution',
    description: 'Cumulative candle-body pressure normalized by range and weighted by volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'WVAD', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,

    aliases: ['wvad', 'williamsvariableaccumulationdistribution'],
    processorFactory: () => new WilliamsVariableAccumulationDistributionProcessor(),
});
