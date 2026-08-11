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
    RingBuffer,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export function rankCorrelation(values: readonly number[]): number {
    const count = values.length;
    const indices = Array.from({ length: count }, (_, index) => index)
        .sort((left, right) => values[left] - values[right]);
    const ranks = new Array<number>(count);
    for (let start = 0; start < count;) {
        let end = start + 1;
        while (end < count && values[indices[end]] === values[indices[start]]) end += 1;
        const rank = (start + 1 + end) / 2;
        for (let index = start; index < end; index += 1) ranks[indices[index]] = rank;
        start = end;
    }

    const mean = (count + 1) / 2;
    let numerator = 0;
    let priceSquares = 0;
    let timeSquares = 0;
    for (let index = 0; index < count; index += 1) {
        const priceDelta = ranks[index] - mean;
        const timeDelta = index + 1 - mean;
        numerator += priceDelta * timeDelta;
        priceSquares += priceDelta * priceDelta;
        timeSquares += timeDelta * timeDelta;
    }
    const denominator = Math.sqrt(priceSquares * timeSquares);
    return denominator === 0 ? 0 : numerator / denominator;
}

export class RankCorrelationIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RingBufferCheckpoint<number | null>
> {
    private readonly prices: RingBuffer<number | null>;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.prices = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const previous = this.prices.toArray();
        const window = this.prices.full ? previous.slice(1) : previous;
        window.push(close);
        const value = window.length === this.length
            && window.every((item): item is number => item !== null)
            ? finite(rankCorrelation(window))
            : null;
        if (commit) this.prices.push(close);
        return {
            isFormed: this.prices.full,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.prices.clear(); }
    protected captureState(): RingBufferCheckpoint<number | null> {
        return this.prices.checkpoint();
    }
    protected restoreState(state: RingBufferCheckpoint<number | null>): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.values) || state.values.length > this.length
            || state.values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid Rank Correlation Index checkpoint');
        }
        this.prices.restore(state);
    }
}

export const RankCorrelationIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'RankCorrelationIndex',
    name: 'Rank Correlation Index',
    description: 'Spearman correlation between close-price rank and time rank.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14, 1)],
    outputs: [{ id: 'line', name: 'RCI', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['rci', 'rankcorrelationindex'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new RankCorrelationIndexProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
    ),
});
