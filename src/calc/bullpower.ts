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
    ExponentialMovingAverage,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
} from './shared/guards.js';

export class BullPowerProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SeededMovingAverageCheckpoint
> {
    private readonly average: ExponentialMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new ExponentialMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const high = finite(input.value?.high);
        const average = commit ? this.average.push(close) : this.average.preview(close);
        const value = average === null || high === null ? null : high - average;
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): SeededMovingAverageCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: SeededMovingAverageCheckpoint): void { this.average.restore(state); }
}

export const BullPowerIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'BullPower',
    name: 'Bull Power',
    description: 'Candle high minus the seeded exponential average of closing prices.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 32, min: 1, max: 500, step: 1,
    }],
    outputs: [{ id: 'line', name: 'Bull Power', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['bullpower'],
    levels: [0],
    processorFactory: (parameters) => new BullPowerProcessor(length(parameters?.length, 13)),
});
