import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    type RingBufferCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    RecursiveLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/recursive-statistical.js';
import {
    finite,
} from './shared/guards.js';

export interface CommodityChannelIndexCheckpoint {
    readonly typicalPrices: RingBufferCheckpoint<number | null>;
}

export class CommodityChannelIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    CommodityChannelIndexCheckpoint
> {
    private readonly index: CommodityChannelIndexKernel;

    constructor(readonly length: number) {
        super(['line']);
        resolvedLength({ length }, length, 1, 500);
        this.index = new CommodityChannelIndexKernel(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const typical = high === null || low === null || close === null
            ? null
            : (high + low + close) / 3;
        const value = commit ? this.index.push(typical) : this.index.preview(typical);
        return {
            isFormed: this.index.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.index.reset(); }

    protected captureState(): CommodityChannelIndexCheckpoint {
        return Object.freeze({ typicalPrices: this.index.checkpoint() });
    }

    protected restoreState(state: CommodityChannelIndexCheckpoint): void {
        this.index.restore(state?.typicalPrices);
    }
}

export const CommodityChannelIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'CommodityChannelIndex',
    name: 'Commodity Channel Index',
    description: 'Typical-price deviation from its rolling mean.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(15, 1, 500)],
    outputs: [{ id: 'line', name: 'CCI', defaultStyle: lineStyle('#26c6da') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['cci'],
    levels: [-100, 0, 100],
    processorFactory: (parameters) => new CommodityChannelIndexProcessor(
        resolvedLength(parameters, 15, 1, 500),
    ),
});
