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
    RecursiveLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/recursive-statistical.js';
import {
    finite,
} from './shared/guards.js';

export interface MarketMeannessIndexCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
    readonly priceChanges: number;
    readonly directionChanges: number;
}

export interface MarketMeannessEvaluation {
    readonly priceChanges: number;
    readonly directionChanges: number;
    readonly size: number;
    readonly value: number | null;
}

export class MarketMeannessIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MarketMeannessIndexCheckpoint
> {
    private readonly values: RingBuffer<number>;
    private priceChanges = 0;
    private directionChanges = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedLength({ length }, length, 2, 2_000);
        this.values = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        if (price === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const evaluation = this.evaluate(price, commit);
        if (commit) {
            this.values.push(price);
            this.priceChanges = evaluation.priceChanges;
            this.directionChanges = evaluation.directionChanges;
        }
        return {
            isFormed: this.values.full,
            values: [this.output('line', evaluation.value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.priceChanges = 0;
        this.directionChanges = 0;
    }

    protected captureState(): MarketMeannessIndexCheckpoint {
        return Object.freeze({
            values: this.values.checkpoint(),
            priceChanges: this.priceChanges,
            directionChanges: this.directionChanges,
        });
    }

    protected restoreState(state: MarketMeannessIndexCheckpoint): void {
        const values = state?.values?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)
            || !Number.isInteger(state.priceChanges) || state.priceChanges < 0
            || !Number.isInteger(state.directionChanges)) {
            throw new TypeError('sschart: invalid Market Meanness Index checkpoint');
        }
        this.values.restore(state.values);
        this.priceChanges = state.priceChanges;
        this.directionChanges = state.directionChanges;
    }

    private evaluate(price: number, commit: boolean): MarketMeannessEvaluation {
        let priceChanges = this.priceChanges;
        let directionChanges = this.directionChanges;
        const size = this.values.size;
        const full = this.values.full;

        // The oldest step leaves the window before the incoming price enters it, on a preview
        // exactly as on a commit -- a preview only unwinds copies of the two counters. What the
        // step takes with it is its OWN successor's reversal, a different step from the newest
        // one, so it has to be read back out of the window rather than remembered.
        if (full) {
            const removed = this.direction(
                this.values.at(0) as number,
                this.values.at(1) as number,
            );
            if (removed !== 0) priceChanges -= 1;
            if (size > 2 && this.isDirectionChange(removed, this.direction(
                this.values.at(1) as number,
                this.values.at(2) as number,
            ))) directionChanges -= 1;
        }

        if (size > 0) {
            // The gained step reverses something only while two prices stay behind it, which for
            // a full window of two the eviction above has just taken away.
            const previous = size > (full ? 2 : 1)
                ? this.direction(
                    this.values.at(size - 2) as number,
                    this.values.at(size - 1) as number,
                )
                : null;
            const gained = this.direction(this.values.at(size - 1) as number, price);
            if (gained !== 0) priceChanges += 1;
            if (previous !== null && this.isDirectionChange(previous, gained))
                directionChanges += 1;
        }

        const nextSize = commit ? Math.min(this.length, size + 1) : size;
        return {
            priceChanges,
            directionChanges,
            size: nextSize,
            value: nextSize === this.length
                ? (priceChanges > 0 ? 100 * directionChanges / priceChanges : 0)
                : null,
        };
    }

    private direction(previous: number, price: number): -1 | 0 | 1 {
        return price > previous ? 1 : (price < previous ? -1 : 0);
    }

    /// A flat step reverses the rise or fall before it; nothing reverses a flat one.
    private isDirectionChange(previous: -1 | 0 | 1, direction: -1 | 0 | 1): boolean {
        return previous !== 0 && direction !== previous;
    }
}

export const MarketMeannessIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'MarketMeannessIndex',
    name: 'Market Meanness Index',
    description: 'Percentage of close-price direction changes in a rolling window.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(200, 2, 2_000)],
    outputs: [{ id: 'line', name: 'MMI', defaultStyle: lineStyle('#ffca28') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['mmi', 'marketmeannessindex'],
    levels: [50],
    processorFactory: (parameters) => new MarketMeannessIndexProcessor(
        resolvedLength(parameters, 200, 2, 2_000),
    ),
});
