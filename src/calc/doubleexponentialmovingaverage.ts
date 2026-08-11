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

export interface DoubleExponentialMovingAverageCheckpoint {
    readonly first: SeededMovingAverageCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
}

export class DoubleExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DoubleExponentialMovingAverageCheckpoint
> {
    private readonly first: ExponentialMovingAverage;
    private readonly second: FiniteExponentialAverage;

    constructor(readonly length: number) {
        super(['line']);
        this.first = new ExponentialMovingAverage(length);
        this.second = new FiniteExponentialAverage(length);
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
        const value = first === null || second === null ? null : 2 * first - second;
        return {
            isFormed: this.second.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.first.reset();
        this.second.reset();
    }
    protected captureState(): DoubleExponentialMovingAverageCheckpoint {
        return Object.freeze({
            first: this.first.checkpoint(),
            second: this.second.checkpoint(),
        });
    }
    protected restoreState(state: DoubleExponentialMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid DEMA checkpoint');
        this.first.restore(state.first);
        this.second.restore(state.second);
    }
}

export const DoubleExponentialMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompoundLengthParameters
> = registerIndicator({
    id: 'DoubleExponentialMovingAverage',
    name: 'Double Exponential Moving Average',
    description: 'Mulloy double EMA that removes most of a single EMA lag.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 32, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'DEMA',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#29b6f6', 2),
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['dema'],
    processorFactory: (parameters) => new DoubleExponentialMovingAverageProcessor(
        integer(parameters?.length, 32, 1, 500, 'length'),
    ),
});
