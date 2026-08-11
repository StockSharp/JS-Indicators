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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface KnowSureThingParameters extends IndicatorParameters {
    readonly roc1Length: number;
    readonly roc2Length: number;
    readonly roc3Length: number;
    readonly roc4Length: number;
    readonly sma1Length: number;
    readonly sma2Length: number;
    readonly sma3Length: number;
    readonly sma4Length: number;
    readonly signalLength: number;
}

export interface KnowSureThingCheckpoint {
    readonly closes: RingBufferCheckpoint<number | null>;
    readonly averages: readonly RollingWindowCheckpoint[];
    readonly signal: RollingWindowCheckpoint;
}

export class KnowSureThingProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KnowSureThingCheckpoint
> {
    private readonly rocLengths: readonly number[];
    private readonly closes: RingBuffer<number | null>;
    private readonly averages: readonly SimpleMovingAverage[];
    private readonly signal: SimpleMovingAverage;

    constructor(
        readonly roc1Length: number,
        readonly roc2Length: number,
        readonly roc3Length: number,
        readonly roc4Length: number,
        readonly sma1Length: number,
        readonly sma2Length: number,
        readonly sma3Length: number,
        readonly sma4Length: number,
        readonly signalLength: number,
    ) {
        super(['kst', 'signal']);
        const rocLengths = [roc1Length, roc2Length, roc3Length, roc4Length];
        const smaLengths = [sma1Length, sma2Length, sma3Length, sma4Length];
        rocLengths.forEach((length, index) => (
            integer(length, length, 1, 500, `roc${index + 1}Length`)
        ));
        smaLengths.forEach((length, index) => (
            integer(length, length, 1, 500, `sma${index + 1}Length`)
        ));
        integer(signalLength, signalLength, 1, 500, 'signalLength');
        this.rocLengths = Object.freeze(rocLengths);
        this.closes = new RingBuffer<number | null>(Math.max(...rocLengths));
        this.averages = Object.freeze(smaLengths.map((length) => (
            new SimpleMovingAverage(length)
        )));
        this.signal = new SimpleMovingAverage(signalLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const current = finite(input.value?.close);
        const rocs = this.rocLengths.map((length) => {
            const previous = this.closes.size === 0
                ? current
                : this.closes.size < length
                    ? (this.closes.front() ?? null)
                    : (this.closes.at(this.closes.size - length) ?? null);
            return current !== null && previous !== null && previous !== 0
                ? finite((current - previous) / previous * 100)
                : null;
        });
        const roc4Formed = this.closes.size >= this.roc4Length && rocs[3] !== null;
        const smoothed = roc4Formed
            ? rocs.map((roc, index) => commit
                ? this.averages[index].push(roc)
                : this.averages[index].preview(roc))
            : [null, null, null, null];
        if (commit) this.closes.push(current);

        const kstFormed = roc4Formed && this.averages[3].isFormed;
        const kst = kstFormed && smoothed.every((value) => value !== null)
            ? finite(
                smoothed[0]! + 2 * smoothed[1]!
                + 3 * smoothed[2]! + 4 * smoothed[3]!,
            )
            : null;
        const signal = kst === null
            ? null
            : (commit ? this.signal.push(kst) : this.signal.preview(kst));
        return {
            isFormed: this.signal.isFormed,
            values: [
                this.formedOutput('kst', kst, commit && kstFormed, input.index),
                this.formedOutput('signal', signal, this.signal.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.closes.clear();
        for (const average of this.averages) average.reset();
        this.signal.reset();
    }

    protected captureState(): KnowSureThingCheckpoint {
        return Object.freeze({
            closes: this.closes.checkpoint(),
            averages: Object.freeze(this.averages.map((average) => average.checkpoint())),
            signal: this.signal.checkpoint(),
        });
    }

    protected restoreState(state: KnowSureThingCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.closes?.values)
            || state.closes.values.length > this.closes.capacity
            || state.closes.values.some((value) => value !== null && finite(value) === null)
            || !Array.isArray(state.averages) || state.averages.length !== 4) {
            throw new TypeError('sschart: invalid Know Sure Thing checkpoint');
        }
        this.closes.restore(state.closes);
        state.averages.forEach((checkpoint, index) => {
            this.averages[index].restore(checkpoint);
        });
        this.signal.restore(state.signal);
    }
}

export const KnowSureThingIndicator: IndicatorDefinition<
    IndicatorCandle,
    KnowSureThingParameters
> = registerIndicator({
    id: 'KnowSureThing',
    name: 'Know Sure Thing',
    description: 'Weighted composite of four smoothed rates of change with a signal average.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        { id: 'roc1Length', name: 'ROC 1 Length', type: IndicatorParameterType.Integer, defaultValue: 10, min: 1, max: 500, step: 1 },
        { id: 'roc2Length', name: 'ROC 2 Length', type: IndicatorParameterType.Integer, defaultValue: 15, min: 1, max: 500, step: 1 },
        { id: 'roc3Length', name: 'ROC 3 Length', type: IndicatorParameterType.Integer, defaultValue: 20, min: 1, max: 500, step: 1 },
        { id: 'roc4Length', name: 'ROC 4 Length', type: IndicatorParameterType.Integer, defaultValue: 30, min: 1, max: 500, step: 1 },
        { id: 'sma1Length', name: 'SMA 1 Length', type: IndicatorParameterType.Integer, defaultValue: 10, min: 1, max: 500, step: 1 },
        { id: 'sma2Length', name: 'SMA 2 Length', type: IndicatorParameterType.Integer, defaultValue: 10, min: 1, max: 500, step: 1 },
        { id: 'sma3Length', name: 'SMA 3 Length', type: IndicatorParameterType.Integer, defaultValue: 10, min: 1, max: 500, step: 1 },
        { id: 'sma4Length', name: 'SMA 4 Length', type: IndicatorParameterType.Integer, defaultValue: 15, min: 1, max: 500, step: 1 },
        { id: 'signalLength', name: 'Signal Length', type: IndicatorParameterType.Integer, defaultValue: 9, min: 1, max: 500, step: 1 },
    ],
    outputs: [
        {
            id: 'kst', name: 'KST',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
        },
        {
            id: 'signal', name: 'Signal',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['kst'],
    processorFactory: (parameters) => new KnowSureThingProcessor(
        integer(parameters?.roc1Length, 10, 1, 500, 'roc1Length'),
        integer(parameters?.roc2Length, 15, 1, 500, 'roc2Length'),
        integer(parameters?.roc3Length, 20, 1, 500, 'roc3Length'),
        integer(parameters?.roc4Length, 30, 1, 500, 'roc4Length'),
        integer(parameters?.sma1Length, 10, 1, 500, 'sma1Length'),
        integer(parameters?.sma2Length, 10, 1, 500, 'sma2Length'),
        integer(parameters?.sma3Length, 10, 1, 500, 'sma3Length'),
        integer(parameters?.sma4Length, 15, 1, 500, 'sma4Length'),
        integer(parameters?.signalLength, 9, 1, 500, 'signalLength'),
    ),
});
