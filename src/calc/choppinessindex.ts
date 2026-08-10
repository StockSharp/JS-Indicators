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
    RingBuffer,
    type RingBufferCheckpoint,
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

export interface ChoppinessIndexCheckpoint {
    readonly highLowRanges: RingBufferCheckpoint<number>;
    readonly trueRanges: RingBufferCheckpoint<number>;
    readonly previousClose: number;
}

export class ChoppinessIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ChoppinessIndexCheckpoint
> {
    private readonly highLowRanges: RingBuffer<number>;
    private readonly trueRanges: RingBuffer<number>;
    private readonly logarithm: number;
    private sumHighLowRange = 0;
    private sumTrueRange = 0;
    private previousClose = 0;

    constructor(readonly length: number) {
        super(['line']);
        this.highLowRanges = new RingBuffer(length);
        this.trueRanges = new RingBuffer(length);
        this.logarithm = Math.log10(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        if (high === null || low === null || close === null) {
            return {
                isFormed: this.highLowRanges.full,
                values: [this.output('line', null, input.index)],
            };
        }

        const highLowRange = high - low;
        const trueRange = Math.max(
            highLowRange,
            Math.abs(high - this.previousClose),
            Math.abs(low - this.previousClose),
        );
        let sumHighLowRange = this.sumHighLowRange;
        let sumTrueRange = this.sumTrueRange;
        if (this.highLowRanges.full) {
            sumHighLowRange -= this.highLowRanges.front()!;
            sumTrueRange -= this.trueRanges.front()!;
        }
        sumHighLowRange += highLowRange;
        sumTrueRange += trueRange;
        const formed = this.highLowRanges.full
            || this.highLowRanges.size + 1 === this.length;

        let value: number | null = null;
        if (formed && this.logarithm !== 0
            && sumTrueRange > 0 && sumHighLowRange > 0) {
            const ratio = sumTrueRange / sumHighLowRange;
            const candidate = ratio > 0
                ? 100 * Math.log10(ratio) / this.logarithm
                : Number.NaN;
            if (Number.isFinite(candidate)) value = candidate;
        }

        if (commit) {
            this.highLowRanges.push(highLowRange);
            this.trueRanges.push(trueRange);
            this.sumHighLowRange = sumHighLowRange;
            this.sumTrueRange = sumTrueRange;
            this.previousClose = close;
        }
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.highLowRanges.clear();
        this.trueRanges.clear();
        this.sumHighLowRange = 0;
        this.sumTrueRange = 0;
        this.previousClose = 0;
    }

    protected captureState(): ChoppinessIndexCheckpoint {
        return Object.freeze({
            highLowRanges: this.highLowRanges.checkpoint(),
            trueRanges: this.trueRanges.checkpoint(),
            previousClose: this.previousClose,
        });
    }

    protected restoreState(state: ChoppinessIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.highLowRanges?.values)
            || !Array.isArray(state.trueRanges?.values)
            || state.highLowRanges.values.length !== state.trueRanges.values.length
            || state.highLowRanges.values.length > this.length
            || state.highLowRanges.values.some((value) => finite(value) === null)
            || state.trueRanges.values.some((value) => finite(value) === null)
            || finite(state.previousClose) === null
            || (state.highLowRanges.values.length === 0 && state.previousClose !== 0)) {
            throw new TypeError('sschart: invalid Choppiness Index checkpoint');
        }
        this.highLowRanges.restore(state.highLowRanges);
        this.trueRanges.restore(state.trueRanges);
        this.sumHighLowRange = state.highLowRanges.values.reduce((sum, value) => sum + value, 0);
        this.sumTrueRange = state.trueRanges.values.reduce((sum, value) => sum + value, 0);
        this.previousClose = state.previousClose;
    }
}

export const ChoppinessIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'ChoppinessIndex',
    name: 'Choppiness Index',
    description: 'Log-scaled ratio of rolling true range to summed candle ranges.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'Choppiness Index',
        defaultStyle: lineStyle('#ab47bc'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['chop'],
    scaleRange: { min: 0, max: 100 },
    levels: [38.2, 61.8],
    processorFactory: (parameters) => new ChoppinessIndexProcessor(
        length(parameters?.length, 14),
    ),
});
