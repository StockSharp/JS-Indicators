import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
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
    CompoundLengthParameters,
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface TripleExponentialMovingAverageCheckpoint {
    readonly first: SeededMovingAverageCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
    readonly third: FiniteExponentialCheckpoint;
}

export class TripleExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TripleExponentialMovingAverageCheckpoint
> {
    private readonly first: ExponentialMovingAverage;
    private readonly second: FiniteExponentialAverage;
    private readonly third: FiniteExponentialAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.first = new ExponentialMovingAverage(length);
        this.second = new FiniteExponentialAverage(length);
        this.third = new FiniteExponentialAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const first = commit ? this.first.push(close) : this.first.preview(close);
        const secondInput = this.first.isFormed ? first : null;
        const second = commit
            ? this.second.push(secondInput)
            : this.second.preview(secondInput);
        const thirdInput = this.second.isFormed ? second : null;
        const third = commit
            ? this.third.push(thirdInput)
            : this.third.preview(thirdInput);
        const value = first === null || second === null || third === null
            ? null
            : 3 * first - 3 * second + third;
        return {
            isFormed: this.third.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.first.reset();
        this.second.reset();
        this.third.reset();
    }
    protected captureState(): TripleExponentialMovingAverageCheckpoint {
        return Object.freeze({
            first: this.first.checkpoint(),
            second: this.second.checkpoint(),
            third: this.third.checkpoint(),
        });
    }
    protected restoreState(state: TripleExponentialMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid TEMA checkpoint');
        this.first.restore(state.first);
        this.second.restore(state.second);
        this.third.restore(state.third);
    }
}

export const TripleExponentialMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompoundLengthParameters
> = registerIndicator({
    id: 'TripleExponentialMovingAverage',
    name: 'Triple Exponential Moving Average',
    description: 'Mulloy triple EMA cascade that further reduces smoothing lag.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 32, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'TEMA',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#ec407a', 2),
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['tema'],
    processorFactory: (parameters) => new TripleExponentialMovingAverageProcessor(
        integer(parameters?.length, 32, 1, 500, 'length'),
    ),
});
