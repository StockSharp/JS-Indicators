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
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    CompoundLengthParameters,
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface TrixCheckpoint {
    readonly first: FiniteExponentialCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
    readonly third: FiniteExponentialCheckpoint;
    readonly previous: number | null;
}

export class TrixProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TrixCheckpoint
> {
    private readonly first: FiniteExponentialAverage;
    private readonly second: FiniteExponentialAverage;
    private readonly third: FiniteExponentialAverage;
    private previous: number | null = null;

    constructor(readonly length: number) {
        super(['line']);
        this.first = new FiniteExponentialAverage(length);
        this.second = new FiniteExponentialAverage(length);
        this.third = new FiniteExponentialAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const first = commit ? this.first.push(close) : this.first.preview(close);
        const second = commit ? this.second.push(first) : this.second.preview(first);
        const third = commit ? this.third.push(second) : this.third.preview(second);

        let value: number | null = null;
        if (third === null) {
            if (commit) this.previous = null;
        } else if (this.previous === null || this.previous === 0) {
            if (commit) this.previous = third;
        } else {
            value = 1_000 * (third - this.previous) / this.previous;
            if (commit) this.previous = third;
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.first.reset();
        this.second.reset();
        this.third.reset();
        this.previous = null;
    }
    protected captureState(): TrixCheckpoint {
        return Object.freeze({
            first: this.first.checkpoint(),
            second: this.second.checkpoint(),
            third: this.third.checkpoint(),
            previous: this.previous,
        });
    }
    protected restoreState(state: TrixCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.previous !== null && finite(state.previous) === null)) {
            throw new TypeError('sschart: invalid Trix checkpoint');
        }
        this.first.restore(state.first);
        this.second.restore(state.second);
        this.third.restore(state.third);
        this.previous = state.previous;
    }
}

export const TrixIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompoundLengthParameters
> = registerIndicator({
    id: 'Trix',
    name: 'Trix',
    description: 'StockSharp-scaled one-bar rate of change of a triple-smoothed EMA.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 32, min: 1, max: 500, step: 1,
    }],
    outputs: [{ id: 'line', name: 'Trix', defaultStyle: style(IndicatorSeriesStyle.Line, '#ab47bc', 2) }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['trix'],
    levels: [0],
    processorFactory: (parameters) => new TrixProcessor(
        integer(parameters?.length, 14, 1, 500, 'length'),
    ),
});
