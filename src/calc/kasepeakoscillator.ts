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
    ExpandingAverageTrueRange,
    RingBuffer,
    type ExpandingAverageTrueRangeCheckpoint,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface KasePeakOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface KasePeakOscillatorCheckpoint {
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
    readonly peaks: RingBufferCheckpoint<number>;
    readonly valleys: RingBufferCheckpoint<number>;
    readonly previousClose: number;
}

export class KasePeakOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KasePeakOscillatorCheckpoint
> {
    private readonly averageTrueRange: ExpandingAverageTrueRange;
    private readonly peaks = new RingBuffer<number>(2);
    private readonly valleys = new RingBuffer<number>(2);
    private previousClose = 0;

    constructor(
        readonly shortPeriod: number,
        readonly longPeriod: number,
    ) {
        super(['shortTerm', 'longTerm']);
        integer(shortPeriod, shortPeriod, 1, 500, 'shortPeriod');
        integer(longPeriod, longPeriod, 1, 500, 'longPeriod');
        this.averageTrueRange = new ExpandingAverageTrueRange(10);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const averageTrueRange = commit
            ? this.averageTrueRange.push(input.value)
            : this.averageTrueRange.preview(input.value);
        const atrFormedFrom = 9;
        const shortFormedAt = atrFormedFrom + this.shortPeriod - 1;
        const longFormedAt = atrFormedFrom + this.longPeriod - 1;
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        if (input.index < atrFormedFrom || averageTrueRange === null
            || high === null || low === null || close === null) {
            return {
                isFormed: false,
                values: [
                    this.output('shortTerm', null, input.index),
                    this.output('longTerm', null, input.index),
                ],
            };
        }

        let peak = high;
        let valley = low;
        if (this.previousClose !== 0) {
            if (close > this.previousClose) {
                peak = Math.max(high, this.previousClose + averageTrueRange);
                valley = Math.max(low, this.previousClose - 0.5 * averageTrueRange);
            } else if (close < this.previousClose) {
                peak = Math.min(high, this.previousClose + 0.5 * averageTrueRange);
                valley = Math.min(low, this.previousClose - averageTrueRange);
            }
        }

        const peaks = this.nextBuffer(this.peaks, peak, commit);
        const valleys = this.nextBuffer(this.valleys, valley, commit);
        if (commit) this.previousClose = close;
        const maximumPeak = Math.max(...peaks);
        const minimumValley = Math.min(...valleys);
        const shortDenominator = maximumPeak - minimumValley;
        const longDenominator = peaks[0] - valleys[0];
        const shortValue = shortDenominator === 0
            ? 0
            : finite(100 * (close - minimumValley) / shortDenominator);
        const longValue = longDenominator === 0
            ? 0
            : finite(100 * (close - valleys[0]) / longDenominator);
        const shortFormed = input.index >= shortFormedAt && shortValue !== null;
        const longFormed = input.index >= longFormedAt && longValue !== null;
        return {
            isFormed: longFormed,
            values: [
                this.formedOutput('shortTerm', shortValue, shortFormed, input.index),
                this.formedOutput('longTerm', longValue, longFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.averageTrueRange.reset();
        this.peaks.clear();
        this.valleys.clear();
        this.previousClose = 0;
    }

    protected captureState(): KasePeakOscillatorCheckpoint {
        return Object.freeze({
            averageTrueRange: this.averageTrueRange.checkpoint(),
            peaks: this.peaks.checkpoint(),
            valleys: this.valleys.checkpoint(),
            previousClose: this.previousClose,
        });
    }

    protected restoreState(state: KasePeakOscillatorCheckpoint): void {
        const validBuffer = (checkpoint: RingBufferCheckpoint<number>) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= 2
            && checkpoint.values.every((value) => finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !validBuffer(state.peaks) || !validBuffer(state.valleys)
            || state.peaks.values.length !== state.valleys.values.length
            || finite(state.previousClose) === null) {
            throw new TypeError('sschart: invalid Kase Peak Oscillator checkpoint');
        }
        this.averageTrueRange.restore(state.averageTrueRange);
        this.peaks.restore(state.peaks);
        this.valleys.restore(state.valleys);
        this.previousClose = state.previousClose;
    }

    private nextBuffer(buffer: RingBuffer<number>, value: number, commit: boolean): number[] {
        if (commit) buffer.push(value);
        const values: number[] = [];
        for (let index = 0; index < buffer.size; index += 1) {
            const current = buffer.at(index);
            if (current !== undefined) values.push(current);
        }
        if (!commit) {
            if (values.length >= 2) values.shift();
            values.push(value);
        }
        return values;
    }
}

export const KasePeakOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    KasePeakOscillatorParameters
> = registerIndicator({
    id: 'KasePeakOscillator',
    name: 'Kase Peak Oscillator',
    description: 'Short- and long-term price position inside ATR-adjusted peak and valley ranges.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 18, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'shortTerm', name: 'Short Term',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
        },
        {
            id: 'longTerm', name: 'Long Term',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['kpo'],
    processorFactory: (parameters) => new KasePeakOscillatorProcessor(
        integer(parameters?.shortPeriod, 9, 1, 500, 'shortPeriod'),
        integer(parameters?.longPeriod, 18, 1, 500, 'longPeriod'),
    ),
});
