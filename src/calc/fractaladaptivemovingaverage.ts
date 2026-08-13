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
import {
    RingBuffer,
    RollingMaximum,
    RollingMinimum,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    AdaptiveLengthParameters,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface FractalAdaptiveCheckpoint {
    readonly previous: number;
    readonly closes: RingBufferCheckpoint<number>;
}

export interface FractalRange {
    readonly minimum: number;
    readonly maximum: number;
}

export class FractalAdaptiveMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    FractalAdaptiveCheckpoint
> {
    private readonly period: number;
    private readonly remaining: number;
    private readonly closes: RingBuffer<number>;
    private readonly periodMinimum: RollingMinimum | null;
    private readonly periodMaximum: RollingMaximum | null;
    private readonly remainingMinimum: RollingMinimum | null;
    private readonly remainingMaximum: RollingMaximum | null;
    private readonly periodRanges: RingBuffer<FractalRange | null> | null;
    private previous = 0;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 4, 500, 'length');
        this.period = Math.floor(length / 3);
        this.remaining = length - this.period * 2;
        this.closes = new RingBuffer(length);
        if (this.period === 0) {
            this.periodMinimum = null;
            this.periodMaximum = null;
            this.remainingMinimum = null;
            this.remainingMaximum = null;
            this.periodRanges = null;
            return;
        }
        this.periodMinimum = new RollingMinimum(this.period);
        this.periodMaximum = new RollingMaximum(this.period);
        this.remainingMinimum = new RollingMinimum(this.remaining);
        this.remainingMaximum = new RollingMaximum(this.remaining);
        this.periodRanges = new RingBuffer(this.period + this.remaining);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null || this.period === 0) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        // Both older ranges end before the candidate close, so they can be
        // resolved from committed state for final input and previews alike.
        const first = this.delayedRange(this.period + this.remaining);
        const second = this.delayedRange(this.remaining);
        const remainingMinimum = commit
            ? this.remainingMinimum!.push(close)
            : this.remainingMinimum!.preview(close);
        const remainingMaximum = commit
            ? this.remainingMaximum!.push(close)
            : this.remainingMaximum!.preview(close);

        if (commit) {
            const wasFormed = this.closes.full;
            const periodMinimum = this.periodMinimum!.push(close);
            const periodMaximum = this.periodMaximum!.push(close);
            this.closes.push(close);
            this.periodRanges!.push(
                periodMinimum === null || periodMaximum === null
                    ? null
                    : Object.freeze({
                        minimum: periodMinimum,
                        maximum: periodMaximum,
                    }),
            );
            // The recursion starts at the close of the bar that fills the window, so the first
            // value the platform draws is that close whatever the fractal dimension says.
            if (!wasFormed && this.closes.full) this.previous = close;
        }

        // A forming bar never reaches the platform's buffer, so it cannot be the bar that fills
        // the window: until Length closes are committed there is nothing to draw, however
        // complete the ranges a preview assembles happen to look.
        if (!this.closes.full
            || first === null || second === null
            || remainingMinimum === null || remainingMaximum === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const firstDimension = (first.maximum - first.minimum) / this.period;
        const secondDimension = (second.maximum - second.minimum) / this.period;
        const thirdDimension = (remainingMaximum - remainingMinimum) / this.period;
        let dimension = (
            Math.log(firstDimension + secondDimension) - Math.log(thirdDimension)
        ) / Math.log(2);
        if (Number.isNaN(dimension)) dimension = 1;
        else dimension = Math.max(1, Math.min(2, dimension));
        const alpha = Math.exp(-4.6 * (dimension - 1));
        const value = alpha * close + (1 - alpha) * this.previous;
        if (commit) this.previous = value;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previous = 0;
        this.closes.clear();
        this.periodMinimum?.reset();
        this.periodMaximum?.reset();
        this.remainingMinimum?.reset();
        this.remainingMaximum?.reset();
        this.periodRanges?.clear();
    }

    protected captureState(): FractalAdaptiveCheckpoint {
        return Object.freeze({
            previous: this.previous,
            closes: this.closes.checkpoint(),
        });
    }

    protected restoreState(state: FractalAdaptiveCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previous) === null
            || state.closes === null || typeof state.closes !== 'object'
            || !Array.isArray(state.closes.values)
            || state.closes.values.length > this.length
            || state.closes.values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid FRAMA checkpoint');
        }
        this.resetState();
        if (this.period > 0) {
            for (const close of state.closes.values) this.restoreClose(close);
        }
        this.previous = state.previous;
    }

    private delayedRange(offset: number): FractalRange | null {
        const ranges = this.periodRanges!;
        const index = ranges.size - offset;
        return index < 0 ? null : (ranges.at(index) ?? null);
    }

    private restoreClose(close: number): void {
        const periodMinimum = this.periodMinimum!.push(close);
        const periodMaximum = this.periodMaximum!.push(close);
        this.remainingMinimum!.push(close);
        this.remainingMaximum!.push(close);
        this.closes.push(close);
        this.periodRanges!.push(
            periodMinimum === null || periodMaximum === null
                ? null
                : Object.freeze({ minimum: periodMinimum, maximum: periodMaximum }),
        );
    }
}

export const FractalAdaptiveMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptiveLengthParameters
> = registerIndicator({
    id: 'FractalAdaptiveMovingAverage',
    name: 'Fractal Adaptive Moving Average',
    description: 'Ehlers adaptive average driven by the rolling fractal dimension.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 20, min: 4, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'FRAMA',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ab47bc',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['frama'],
    processorFactory: (parameters) => new FractalAdaptiveMovingAverageProcessor(
        integer(parameters?.length, 20, 4, 500, 'length'),
    ),
});
