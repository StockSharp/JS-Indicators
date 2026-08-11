import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorParameters,
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
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface RelativeVigorIndexParameters extends IndicatorParameters {
    readonly averageLength: number;
    readonly signalLength: number;
}

export interface RelativeVigorSample {
    readonly numerator: number;
    readonly denominator: number;
}

export interface RelativeVigorIndexCheckpoint {
    readonly samples: RingBufferCheckpoint<RelativeVigorSample | null>;
    readonly values: RingBufferCheckpoint<number | null>;
}

export class RelativeVigorIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RelativeVigorIndexCheckpoint
> {
    private readonly samples: RingBuffer<RelativeVigorSample | null>;
    private readonly values: RingBuffer<number | null>;

    constructor(readonly averageLength: number, readonly signalLength: number) {
        super(['rvi', 'signal']);
        integer(averageLength, averageLength, 4, 200, 'averageLength');
        integer(signalLength, signalLength, 4, 100, 'signalLength');
        this.samples = new RingBuffer<RelativeVigorSample | null>(averageLength);
        this.values = new RingBuffer<number | null>(signalLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const numerator = open === null || close === null ? null : finite(close - open);
        const denominator = high === null || low === null ? null : finite(high - low);
        const sample = numerator === null || denominator === null
            ? null
            : Object.freeze({ numerator, denominator });
        if (commit) this.samples.push(sample);
        const rviFormed = this.samples.size >= this.averageLength;
        const rvi = rviFormed ? this.weightedSample(sample, commit) : null;

        // RelativeVigorIndex is a sequence-mode complex indicator: its signal
        // buffer starts only after the average line has formed.
        if (commit && rviFormed) this.values.push(rvi);
        const signalFormed = this.values.size >= this.signalLength;
        const signal = rviFormed && signalFormed
            ? this.weightedValue(rvi, commit)
            : null;
        return {
            isFormed: signalFormed,
            values: [
                this.formedOutput('rvi', rvi, rviFormed, input.index),
                this.formedOutput('signal', signal, signalFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.samples.clear();
        this.values.clear();
    }

    protected captureState(): RelativeVigorIndexCheckpoint {
        return Object.freeze({
            samples: this.samples.checkpoint(),
            values: this.values.checkpoint(),
        });
    }

    protected restoreState(state: RelativeVigorIndexCheckpoint): void {
        const samples = state?.samples?.values;
        const values = state?.values?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(samples) || samples.length > this.averageLength
            || samples.some((sample) => sample !== null && (
                typeof sample !== 'object'
                || finite(sample.numerator) === null || finite(sample.denominator) === null
            ))
            || !Array.isArray(values) || values.length > this.signalLength
            || values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid Relative Vigor Index checkpoint');
        }
        this.samples.restore(state.samples);
        this.values.restore(state.values);
    }

    private weightedSample(
        incoming: RelativeVigorSample | null,
        commit: boolean,
    ): number | null {
        const first = this.samples.at(commit ? 0 : 1);
        const second = this.samples.at(commit ? 1 : 2);
        const third = this.samples.at(commit ? 2 : 3);
        const fourth = commit ? this.samples.at(3) : incoming;
        if (first === null || first === undefined
            || second === null || second === undefined
            || third === null || third === undefined
            || fourth === null || fourth === undefined) return null;
        const numerator = (first.numerator + 2 * second.numerator
            + 2 * third.numerator + fourth.numerator) / 6;
        const denominator = (first.denominator + 2 * second.denominator
            + 2 * third.denominator + fourth.denominator) / 6;
        return finite(denominator === 0 ? numerator : numerator / denominator);
    }

    private weightedValue(incoming: number | null, commit: boolean): number | null {
        const first = this.values.at(commit ? 0 : 1);
        const second = this.values.at(commit ? 1 : 2);
        const third = this.values.at(commit ? 2 : 3);
        const fourth = commit ? this.values.at(3) : incoming;
        if (first === null || first === undefined
            || second === null || second === undefined
            || third === null || third === undefined
            || fourth === null || fourth === undefined) return null;
        return finite((first + 2 * second + 2 * third + fourth) / 6);
    }
}

export const RelativeVigorIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RelativeVigorIndexParameters
> = registerIndicator({
    id: 'RelativeVigorIndex',
    name: 'RVI',
    description: 'Weighted close-open vigor relative to candle range with a signal line.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'averageLength', name: 'Average Length', type: IndicatorParameterType.Integer,
            defaultValue: 4, min: 4, max: 200, step: 1,
        },
        {
            id: 'signalLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 4, min: 4, max: 100, step: 1,
        },
    ],
    outputs: [
        { id: 'rvi', name: 'RVI', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'signal', name: 'Signal', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['rvi', 'relativevigorindex'],
    painter: 'dual-line',
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new RelativeVigorIndexProcessor(
        integer(parameters?.averageLength, 4, 4, 200, 'averageLength'),
        integer(parameters?.signalLength, 4, 4, 100, 'signalLength'),
    ),
});
