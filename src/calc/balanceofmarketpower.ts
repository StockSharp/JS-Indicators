import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
    number,
} from './shared/guards.js';

export class BalanceOfMarketPowerProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        let raw: number | null = null;
        if (open !== null && high !== null && low !== null && close !== null) {
            const volume = finite(input.value?.volume) ?? 0;
            raw = volume === 0
                ? 0
                : (close - open) / (high === low ? 0.01 : high - low);
            if (!Number.isFinite(raw)) raw = null;
        }
        const value = commit ? this.average.push(raw) : this.average.preview(raw);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const BalanceOfMarketPowerIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'BalanceOfMarketPower',
    name: 'Balance Of Market Power',
    description: 'Simple average of candle body power normalized by range and gated by volume.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'Balance Of Market Power',
        defaultStyle: lineStyle('#5c6bc0'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['bomp'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new BalanceOfMarketPowerProcessor(
        length(parameters?.length, 14),
    ),
});
