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
import { RingBuffer, type RingBufferCheckpoint } from '../math/index.js';
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

export interface TrixCheckpoint {
    readonly first: FiniteExponentialCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
    readonly third: FiniteExponentialCheckpoint;
    readonly rateOfChange: RingBufferCheckpoint<number>;
}

export interface TrixParameters extends CompoundLengthParameters {
    readonly rocLength: number;
}

export class TrixProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TrixCheckpoint
> {
    private readonly first: FiniteExponentialAverage;
    private readonly second: FiniteExponentialAverage;
    private readonly third: FiniteExponentialAverage;
    private readonly rateOfChange: RingBuffer<number>;

    constructor(readonly length: number, readonly rocLength: number) {
        super(['line']);
        integer(rocLength, rocLength, 1, 500, 'rocLength');
        this.first = new FiniteExponentialAverage(length);
        this.second = new FiniteExponentialAverage(length);
        this.third = new FiniteExponentialAverage(length);
        this.rateOfChange = new RingBuffer(rocLength + 1);
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

        if (commit && third !== null && this.third.isFormed)
            this.rateOfChange.push(third);
        const formed = this.rateOfChange.size > this.rocLength;
        const reference = this.rateOfChange.front();
        const value = formed && third !== null
            && typeof reference === 'number' && reference !== 0
            ? 1_000 * (third - reference) / reference
            : null;
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.first.reset();
        this.second.reset();
        this.third.reset();
        this.rateOfChange.clear();
    }
    protected captureState(): TrixCheckpoint {
        return Object.freeze({
            first: this.first.checkpoint(),
            second: this.second.checkpoint(),
            third: this.third.checkpoint(),
            rateOfChange: this.rateOfChange.checkpoint(),
        });
    }
    protected restoreState(state: TrixCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.rateOfChange?.values)
            || state.rateOfChange.values.length > this.rocLength + 1
            || state.rateOfChange.values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Trix checkpoint');
        }
        this.first.restore(state.first);
        this.second.restore(state.second);
        this.third.restore(state.third);
        this.rateOfChange.restore(state.rateOfChange);
    }
}

export const TrixIndicator: IndicatorDefinition<
    IndicatorCandle,
    TrixParameters
> = registerIndicator({
    id: 'Trix',
    name: 'Trix',
    description: 'StockSharp-scaled one-bar rate of change of a triple-smoothed EMA.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 32, min: 1, max: 500, step: 1,
        },
        {
            id: 'rocLength', name: 'ROC Length', type: IndicatorParameterType.Integer,
            defaultValue: 1, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{ id: 'line', name: 'Trix', defaultStyle: style(IndicatorSeriesStyle.Line, '#ab47bc', 2) }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['trix'],
    levels: [0],
    processorFactory: (parameters) => new TrixProcessor(
        integer(parameters?.length, 32, 1, 500, 'length'),
        integer(parameters?.rocLength, 1, 1, 500, 'rocLength'),
    ),
});
