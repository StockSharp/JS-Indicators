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

export interface WilliamsAccumulationDistributionCheckpoint {
    readonly previousClose: number;
    readonly value: number;
}

export class WilliamsAccumulationDistributionProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    WilliamsAccumulationDistributionCheckpoint
> {
    private previousClose = 0;
    private current = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null) return this.empty(input.index);
        if (this.previousClose === 0) {
            if (commit) this.previousClose = close;
            return this.empty(input.index);
        }

        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        if (high === null || low === null) {
            if (commit) this.previousClose = close;
            return this.empty(input.index);
        }

        const delta = close > this.previousClose
            ? close - Math.min(low, this.previousClose)
            : close < this.previousClose
                ? close - Math.max(high, this.previousClose)
                : 0;
        const value = this.current + delta;
        if (commit) {
            this.current = value;
            this.previousClose = close;
        }
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.current = 0;
    }

    protected captureState(): WilliamsAccumulationDistributionCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            value: this.current,
        });
    }

    protected restoreState(state: WilliamsAccumulationDistributionCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null || finite(state.value) === null) {
            throw new TypeError('sschart: invalid Williams A/D checkpoint');
        }
        this.previousClose = state.previousClose;
        this.current = state.value;
    }

    private empty(index: number): IndicatorCalculationResult {
        return {
            isFormed: false,
            values: [this.output('line', null, index)],
        };
    }
}

export const WilliamsAccumulationDistributionIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'WilliamsAccumulationDistribution',
    name: 'Williams Accumulation Distribution',
    description: 'Cumulative Williams buying and selling pressure relative to the prior close.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Williams A/D', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,

    aliases: ['wad', 'williamsad', 'williamsaccumulationdistribution'],
    processorFactory: () => new WilliamsAccumulationDistributionProcessor(),
});
