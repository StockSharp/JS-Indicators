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
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface KlingerVolumeOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface KlingerVolumeOscillatorCheckpoint {
    readonly previousHlc: number;
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}

export class KlingerVolumeOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KlingerVolumeOscillatorCheckpoint
> {
    private previousHlc = 0;
    private readonly short: FiniteExponentialAverage;
    private readonly long: FiniteExponentialAverage;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['shortEma', 'longEma', 'oscillator']);
        integer(shortPeriod, shortPeriod, 1, 500, 'shortPeriod');
        integer(longPeriod, longPeriod, 1, 500, 'longPeriod');
        this.short = new FiniteExponentialAverage(shortPeriod);
        this.long = new FiniteExponentialAverage(longPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        const valid = high !== null && low !== null && close !== null && volume !== null;
        const typical = valid ? finite((high + low + close) / 3) : null;
        const signedVolume = typical === null || volume === null
            ? null
            : finite(volume * (typical > this.previousHlc ? 1 : -1));
        const short = commit ? this.short.push(signedVolume) : this.short.preview(signedVolume);
        const long = commit ? this.long.push(signedVolume) : this.long.preview(signedVolume);
        if (commit && typical !== null) this.previousHlc = typical;
        const oscillator = short === null || long === null ? null : finite(short - long);
        return {
            isFormed: this.short.isFormed && this.long.isFormed,
            values: [
                this.formedOutput('shortEma', short, this.short.isFormed, input.index),
                this.formedOutput('longEma', long, this.long.isFormed, input.index),
                this.formedOutput('oscillator', oscillator, this.short.isFormed && this.long.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.previousHlc = 0;
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): KlingerVolumeOscillatorCheckpoint {
        return Object.freeze({
            previousHlc: this.previousHlc,
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
        });
    }

    protected restoreState(state: KlingerVolumeOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousHlc) === null) {
            throw new TypeError('sschart: invalid Klinger Volume Oscillator checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
        this.previousHlc = state.previousHlc;
    }
}

export const KlingerVolumeOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    KlingerVolumeOscillatorParameters
> = registerIndicator({
    id: 'KlingerVolumeOscillator',
    name: 'Klinger Volume Oscillator',
    description: 'Difference between short and long averages of direction-signed candle volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 34, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 55, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'shortEma', name: 'Short EMA',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5'),
        },
        {
            id: 'longEma', name: 'Long EMA',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
        {
            id: 'oscillator', name: 'Oscillator',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ab47bc', 2),
        },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['kvo'],
    processorFactory: (parameters) => new KlingerVolumeOscillatorProcessor(
        integer(parameters?.shortPeriod, 34, 1, 500, 'shortPeriod'),
        integer(parameters?.longPeriod, 55, 1, 500, 'longPeriod'),
    ),
});
