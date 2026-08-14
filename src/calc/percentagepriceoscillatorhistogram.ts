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
import { isPlatformZero } from '../math/index.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface PercentagePriceOscillatorHistogramParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly signalMaLength: number;
}

export interface PercentagePriceOscillatorHistogramCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
    readonly signal: FiniteExponentialCheckpoint;
}

export class PercentagePriceOscillatorHistogramProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PercentagePriceOscillatorHistogramCheckpoint
> {
    private readonly short: FiniteExponentialAverage;
    private readonly long: FiniteExponentialAverage;
    private readonly signal: FiniteExponentialAverage;

    constructor(
        readonly shortPeriod: number,
        readonly longPeriod: number,
        readonly signalMaLength: number,
    ) {
        super(['ppo', 'signal', 'histogram']);
        integer(shortPeriod, shortPeriod, 1, 200, 'shortPeriod');
        integer(longPeriod, longPeriod, 1, 400, 'longPeriod');
        integer(signalMaLength, signalMaLength, 1, 100, 'signalMaLength');
        this.short = new FiniteExponentialAverage(shortPeriod);
        this.long = new FiniteExponentialAverage(longPeriod);
        this.signal = new FiniteExponentialAverage(signalMaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit ? this.short.push(close) : this.short.preview(close);
        const long = commit ? this.long.push(close) : this.long.preview(close);
        const ppo = short === null || long === null || close === null
            ? null
            : (isPlatformZero(long, close) ? 0 : finite((short - long) / long * 100));
        const ppoFormed = this.short.isFormed && this.long.isFormed;
        const signalInput = ppoFormed ? ppo : null;
        const signal = commit
            ? this.signal.push(signalInput)
            : this.signal.preview(signalInput);
        const histogram = ppo === null || signal === null ? null : ppo - signal;
        return {
            isFormed: this.signal.isFormed,
            values: [
                this.formedOutput('ppo', ppo, ppoFormed, input.index),
                this.formedOutput('signal', signal, this.signal.isFormed, input.index),
                this.formedOutput('histogram', histogram, this.signal.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
        this.signal.reset();
    }

    protected captureState(): PercentagePriceOscillatorHistogramCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
            signal: this.signal.checkpoint(),
        });
    }

    protected restoreState(state: PercentagePriceOscillatorHistogramCheckpoint): void {
        if (state === null || typeof state !== 'object') {
            throw new TypeError('sschart: invalid Percentage Price Oscillator checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
        this.signal.restore(state.signal);
    }
}

export const PercentagePriceOscillatorHistogramIndicator: IndicatorDefinition<
    IndicatorCandle,
    PercentagePriceOscillatorHistogramParameters
> = registerIndicator({
    id: 'PercentagePriceOscillatorHistogram',
    name: 'PPO Histogram',
    description: 'Percentage difference between short and long EMA with signal and histogram.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 200, step: 1,
            aliases: ['ppoShortPeriod'],
        },
        {
            id: 'longPeriod', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 400, step: 1,
            aliases: ['ppoLongPeriod'],
        },
        {
            id: 'signalMaLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 100, step: 1,
        },
    ],
    outputs: [
        { id: 'ppo', name: 'PPO Histogram', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'signal', name: 'Signal', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
        {
            id: 'histogram', name: 'Histogram',
            defaultStyle: style(IndicatorSeriesStyle.Histogram, '#ab47bc'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['ppohistogram'],
    painter: 'ppo-histogram',
    levels: [0],
    processorFactory: (parameters) => new PercentagePriceOscillatorHistogramProcessor(
        integer(parameters?.shortPeriod, 12, 1, 200, 'shortPeriod'),
        integer(parameters?.longPeriod, 26, 1, 400, 'longPeriod'),
        integer(parameters?.signalMaLength, 9, 1, 100, 'signalMaLength'),
    ),
});
