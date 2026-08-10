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
    number,
} from './shared/guards.js';

export class ElderRayProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SeededMovingAverageCheckpoint
> {
    private readonly average: ExponentialMovingAverage;

    constructor(readonly length: number) {
        super(['bull', 'bear']);
        this.average = new ExponentialMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const average = commit ? this.average.push(close) : this.average.preview(close);
        const bull = average === null || high === null ? null : finite(high - average);
        const bear = average === null || low === null ? null : finite(low - average);
        return {
            isFormed: bull !== null && bear !== null,
            values: [
                this.output('bull', bull, input.index),
                this.output('bear', bear, input.index),
            ],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): SeededMovingAverageCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: SeededMovingAverageCheckpoint): void {
        this.average.restore(state);
    }
}

export const ElderRayIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'ElderRay',
    name: 'Elder Ray',
    description: 'Bull and bear power around a shared exponential moving average.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 13, min: 1, max: 500, step: 1,
    }],
    outputs: [
        {
            id: 'bull', name: 'Bull Power',
            defaultStyle: lineStyle('#26a69a'),
        },
        {
            id: 'bear', name: 'Bear Power',
            defaultStyle: lineStyle('#ef5350'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['elderray'],
    levels: [0],
    processorFactory: (parameters) => new ElderRayProcessor(
        length(parameters?.length, 13),
    ),
});
