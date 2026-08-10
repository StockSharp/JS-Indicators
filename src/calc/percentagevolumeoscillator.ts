import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    ExponentialMovingAverage,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface PercentageVolumeOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface PercentageVolumeOscillatorCheckpoint {
    readonly short: SeededMovingAverageCheckpoint;
    readonly long: SeededMovingAverageCheckpoint;
}

export class PercentageVolumeOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PercentageVolumeOscillatorCheckpoint
> {
    private readonly short: ExponentialMovingAverage;
    private readonly long: ExponentialMovingAverage;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['shortEma', 'longEma', 'pvo']);
        resolvedPeriod(shortPeriod, shortPeriod, 'shortPeriod');
        resolvedPeriod(longPeriod, longPeriod, 'longPeriod');
        this.short = new ExponentialMovingAverage(shortPeriod);
        this.long = new ExponentialMovingAverage(longPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const volume = finite(input.value?.volume);
        const short = commit ? this.short.push(volume) : this.short.preview(volume);
        const long = commit ? this.long.push(volume) : this.long.preview(volume);
        const pvo = short === null || long === null
            ? null
            : (long === 0 ? 0 : finite((short - long) / long * 100));
        return {
            isFormed: pvo !== null,
            values: [
                this.output('shortEma', short, input.index),
                this.output('longEma', long, input.index),
                this.output('pvo', pvo, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): PercentageVolumeOscillatorCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
        });
    }

    protected restoreState(state: PercentageVolumeOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object') {
            throw new TypeError('sschart: invalid Percentage Volume Oscillator checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const PercentageVolumeOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    PercentageVolumeOscillatorParameters
> = registerIndicator({
    id: 'PercentageVolumeOscillator',
    name: 'Percentage Volume Oscillator',
    description: 'Percentage difference between short and long exponential volume averages.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'shortEma', name: 'Short EMA',
            defaultStyle: lineStyle('#42a5f5'),
        },
        {
            id: 'longEma', name: 'Long EMA',
            defaultStyle: lineStyle('#ffca28'),
        },
        {
            id: 'pvo', name: 'PVO',
            defaultStyle: lineStyle('#ab47bc'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['pvo'],
    processorFactory: (parameters) => new PercentageVolumeOscillatorProcessor(
        resolvedPeriod(parameters?.shortPeriod, 12, 'shortPeriod'),
        resolvedPeriod(parameters?.longPeriod, 26, 'longPeriod'),
    ),
});
