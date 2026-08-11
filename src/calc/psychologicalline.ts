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
    resolvedLength,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface PsychologicalLineCheckpoint {
    readonly closes: RingBufferCheckpoint<number>;
    readonly upCount: number;
}

export class PsychologicalLineProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PsychologicalLineCheckpoint
> {
    private readonly closes: RingBuffer<number>;
    private upCount = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.closes = new RingBuffer(length);
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

        let upCount = this.upCount;
        const latest = this.closes.back();
        if (commit && this.closes.full && this.closes.front()! < latest!) upCount -= 1;
        if (latest !== undefined && price > latest) upCount += 1;
        const formed = commit
            ? this.closes.full || this.closes.size + 1 === this.length
            : this.closes.full;
        if (commit) {
            this.closes.push(price);
            this.upCount = upCount;
        }
        const value = formed ? upCount / this.length : null;
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.closes.clear();
        this.upCount = 0;
    }

    protected captureState(): PsychologicalLineCheckpoint {
        return Object.freeze({
            closes: this.closes.checkpoint(),
            upCount: this.upCount,
        });
    }

    protected restoreState(state: PsychologicalLineCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Number.isInteger(state.upCount)
            || !Array.isArray(state.closes?.values)
            || state.closes.values.length > this.length
            || state.closes.values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Psychological Line checkpoint');
        }
        this.closes.restore(state.closes);
        this.upCount = state.upCount;
    }
}

export const PsychologicalLineIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'PsychologicalLine',
    name: 'Psychological Line',
    description: 'Ratio of advancing closes in StockSharp\'s trailing psychological window.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(20)],
    outputs: [{
        id: 'line', name: 'Psychological Line',
        defaultStyle: lineStyle('#7e57c2'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['psy', 'psychologicalline'],
    scaleRange: { min: 0, max: 1 },
    levels: [0.25, 0.75],
    processorFactory: (parameters) => new PsychologicalLineProcessor(
        resolvedLength(parameters, 20),
    ),
});
