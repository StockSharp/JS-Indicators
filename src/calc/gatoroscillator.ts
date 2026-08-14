import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
import {
    RingBuffer,
    SmoothedMovingAverage,
    type RingBufferCheckpoint,
    type SmoothedMovingAverageCheckpoint,
} from '../math/index.js';
import {
    AlligatorParameters,
    gatorParameterSchema,
    period,
    validWindow,
} from './shared/shifted-sparse.js';
import {
    finite,
} from './shared/guards.js';

export interface GatorLineCheckpoint {
    readonly average: SmoothedMovingAverageCheckpoint;
    readonly delay: RingBufferCheckpoint<number | null>;
}

export interface GatorOscillatorCheckpoint {
    readonly jaw: GatorLineCheckpoint;
    readonly teeth: GatorLineCheckpoint;
    readonly lips: GatorLineCheckpoint;
}

export class GatorOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    GatorOscillatorCheckpoint
> {
    private readonly jaw: SmoothedMovingAverage;
    private readonly teeth: SmoothedMovingAverage;
    private readonly lips: SmoothedMovingAverage;
    private readonly jawDelay: RingBuffer<number | null>;
    private readonly teethDelay: RingBuffer<number | null>;
    private readonly lipsDelay: RingBuffer<number | null>;

    constructor(
        readonly jawLength: number,
        readonly jawShift: number,
        readonly teethLength: number,
        readonly teethShift: number,
        readonly lipsLength: number,
        readonly lipsShift: number,
    ) {
        super(['upper', 'lower']);
        period(jawLength, jawLength, 1, 200, 'jawLength');
        period(jawShift, jawShift, 0, 100, 'jawShift');
        period(teethLength, teethLength, 1, 200, 'teethLength');
        period(teethShift, teethShift, 0, 100, 'teethShift');
        period(lipsLength, lipsLength, 1, 200, 'lipsLength');
        period(lipsShift, lipsShift, 0, 100, 'lipsShift');
        this.jaw = new SmoothedMovingAverage(jawLength);
        this.teeth = new SmoothedMovingAverage(teethLength);
        this.lips = new SmoothedMovingAverage(lipsLength);
        this.jawDelay = new RingBuffer(jawShift + 1);
        this.teethDelay = new RingBuffer(teethShift + 1);
        this.lipsDelay = new RingBuffer(lipsShift + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const median = high === null || low === null ? null : (high + low) / 2;
        const jaw = this.line(
            this.jaw,
            this.jawDelay,
            this.jawLength,
            this.jawShift,
            median,
            input.index,
            commit,
        );
        const teeth = this.line(
            this.teeth,
            this.teethDelay,
            this.teethLength,
            this.teethShift,
            median,
            input.index,
            commit,
        );
        const lips = this.line(
            this.lips,
            this.lipsDelay,
            this.lipsLength,
            this.lipsShift,
            median,
            input.index,
            commit,
        );
        const upper = jaw === null || lips === null ? null : Math.abs(jaw - lips);
        const lower = lips === null || teeth === null ? null : -Math.abs(lips - teeth);
        const jawIsFormed = this.jaw.isFormed && this.jawDelay.size > this.jawShift;
        return {
            isFormed: jawIsFormed,
            values: [
                this.formedOutput('upper', upper, commit, input.index),
                this.formedOutput('lower', lower, commit, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.jaw.reset();
        this.teeth.reset();
        this.lips.reset();
        this.jawDelay.clear();
        this.teethDelay.clear();
        this.lipsDelay.clear();
    }
    protected captureState(): GatorOscillatorCheckpoint {
        return Object.freeze({
            jaw: this.lineCheckpoint(this.jaw, this.jawDelay),
            teeth: this.lineCheckpoint(this.teeth, this.teethDelay),
            lips: this.lineCheckpoint(this.lips, this.lipsDelay),
        });
    }
    protected restoreState(state: GatorOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Gator checkpoint');
        this.restoreLine(state.jaw, this.jaw, this.jawDelay, this.jawShift + 1);
        this.restoreLine(state.teeth, this.teeth, this.teethDelay, this.teethShift + 1);
        this.restoreLine(state.lips, this.lips, this.lipsDelay, this.lipsShift + 1);
    }

    private line(
        average: SmoothedMovingAverage,
        delay: RingBuffer<number | null>,
        length: number,
        shift: number,
        median: number | null,
        sourceIndex: number,
        commit: boolean,
    ): number | null {
        // Nothing is computed for a bar that is still forming: the histogram cannot see it, so the
        // average is advanced by a commit only.
        const current = commit ? average.push(median) : null;
        const candidate = sourceIndex >= length - 1 ? current : null;
        if (commit) {
            delay.push(candidate);
            const index = delay.size - shift - 1;
            return index < 0 ? null : (delay.at(index) ?? null);
        }
        // The forming bar never reaches the histogram. GatorHistogram reads its two lines through
        // `GetNullableCurrentValue()`, which is the line's container, and `BaseIndicator.Process`
        // fills that container only `if (input.IsFinal)` -- so a preview still sees what each line
        // returned for the bar before it, whatever those lines computed for the bar being
        // previewed. That is the slot the previous commit read, at every shift.
        const index = delay.size - shift - 1;
        return index < 0 ? null : (delay.at(index) ?? null);
    }

    private lineCheckpoint(
        average: SmoothedMovingAverage,
        delay: RingBuffer<number | null>,
    ): GatorLineCheckpoint {
        return Object.freeze({
            average: average.checkpoint(),
            delay: delay.checkpoint(),
        });
    }

    private restoreLine(
        state: GatorLineCheckpoint,
        average: SmoothedMovingAverage,
        delay: RingBuffer<number | null>,
        capacity: number,
    ): void {
        if (state === null || typeof state !== 'object'
            || !validWindow(state.delay, capacity)) {
            throw new TypeError('sschart: invalid Gator line checkpoint');
        }
        average.restore(state.average);
        delay.restore(state.delay);
    }
}

export const GatorOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    AlligatorParameters
> = registerIndicator({
    id: 'GatorOscillator',
    name: 'Gator Oscillator',
    description: 'Aligned distances between the independently shifted Alligator lines.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: gatorParameterSchema(),
    outputs: [
        {
            id: 'upper',
            name: 'Upper',
            defaultStyle: {
                series: IndicatorSeriesStyle.Histogram,
                color: '#00c853',
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'lower',
            name: 'Lower',
            defaultStyle: {
                series: IndicatorSeriesStyle.Histogram,
                color: '#ff3d57',
                options: { priceLineVisible: false },
            },
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['gator', 'gatoroscillator'],
    painter: 'gator',
    processorFactory: (parameters) => new GatorOscillatorProcessor(
        period(parameters?.jawLength, 13, 1, 200, 'jawLength'),
        period(parameters?.jawShift, 8, 0, 100, 'jawShift'),
        period(parameters?.teethLength, 8, 1, 200, 'teethLength'),
        period(parameters?.teethShift, 5, 0, 100, 'teethShift'),
        period(parameters?.lipsLength, 5, 1, 200, 'lipsLength'),
        period(parameters?.lipsShift, 3, 0, 100, 'lipsShift'),
    ),
});
