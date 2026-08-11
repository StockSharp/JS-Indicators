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
    readonly previousDirection: -1 | 0 | 1;
}

export interface MarketMeannessEvaluation {
    readonly priceChanges: number;
    readonly directionChanges: number;
    readonly previousDirection: -1 | 0 | 1;
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
    private previousDirection: -1 | 0 | 1 = 0;

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
            this.previousDirection = evaluation.previousDirection;
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
        this.previousDirection = 0;
    }

    protected captureState(): MarketMeannessIndexCheckpoint {
        return Object.freeze({
            values: this.values.checkpoint(),
            priceChanges: this.priceChanges,
            directionChanges: this.directionChanges,
            previousDirection: this.previousDirection,
        });
    }

    protected restoreState(state: MarketMeannessIndexCheckpoint): void {
        const values = state?.values?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)
            || !Number.isInteger(state.priceChanges) || state.priceChanges < 0
            || !Number.isInteger(state.directionChanges)
            || ![-1, 0, 1].includes(state.previousDirection)) {
            throw new TypeError('sschart: invalid Market Meanness Index checkpoint');
        }
        this.values.restore(state.values);
        this.priceChanges = state.priceChanges;
        this.directionChanges = state.directionChanges;
        this.previousDirection = state.previousDirection;
    }

    private evaluate(price: number, commit: boolean): MarketMeannessEvaluation {
        let priceChanges = this.priceChanges;
        let directionChanges = this.directionChanges;
        let previousDirection = this.previousDirection;
        const retainedSize = this.values.size - (this.values.full ? 1 : 0);

        if (commit && this.values.full) {
            const oldest = this.values.front() as number;
            const next = this.values.at(1);
            const removedDirection = next === undefined ? 0 : this.sign(next - oldest);
            if (removedDirection !== 0) priceChanges -= 1;
            if (removedDirection !== previousDirection && previousDirection !== 0)
                directionChanges -= 1;
        }

        const canCompare = commit
            ? retainedSize > 0
            : this.values.size > 1 && price !== this.values.back();
        if (canCompare) {
            const addedDirection = this.sign(price - (this.values.back() as number));
            if (addedDirection !== 0) priceChanges += 1;
            if (addedDirection !== previousDirection && previousDirection !== 0)
                directionChanges += 1;
            previousDirection = addedDirection;
        }

        const size = commit
            ? Math.min(this.length, this.values.size + 1)
            : this.values.size;
        const candidate = size === this.length
            ? (priceChanges > 0 ? 100 * directionChanges / priceChanges : 0)
            : null;
        return {
            priceChanges,
            directionChanges,
            previousDirection,
            size,
            value: finite(candidate),
        };
    }

    private sign(value: number): -1 | 0 | 1 {
        return value > 0 ? 1 : (value < 0 ? -1 : 0);
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
