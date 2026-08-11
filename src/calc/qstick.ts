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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export class QStickProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const close = finite(input.value?.close);
        const difference = open === null || close === null ? null : open - close;
        const value = commit
            ? this.average.push(difference)
            : this.average.preview(difference);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.values) || state.values.length > this.length
            || state.values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid QStick checkpoint');
        }
        this.average.restore(state);
    }
}

export const QStickIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'QStick',
    name: 'Q Stick',
    description: 'Simple moving average of the candle open-minus-close difference.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(15)],
    outputs: [{ id: 'line', name: 'Q Stick', defaultStyle: lineStyle('#ec407a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['qstick'],
    levels: [0],
    processorFactory: (parameters) => new QStickProcessor(resolvedLength(parameters, 15)),
});
