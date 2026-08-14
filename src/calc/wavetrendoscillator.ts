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
    ExponentialMovingAverage,
    isPlatformZero,
    PartialSeedSimpleMovingAverage,
    type RingBufferCheckpoint,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface WaveTrendOscillatorParameters extends IndicatorParameters {
    readonly esaPeriod: number;
    readonly dPeriod: number;
    readonly averagePeriod: number;
}

export interface WaveTrendOscillatorCheckpoint {
    readonly esa: SeededMovingAverageCheckpoint;
    readonly deviation: SeededMovingAverageCheckpoint;
    readonly average: RingBufferCheckpoint<number>;
}

export class WaveTrendOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    WaveTrendOscillatorCheckpoint
> {
    private readonly esa: ExponentialMovingAverage;
    private readonly deviation: ExponentialMovingAverage;
    private readonly average: PartialSeedSimpleMovingAverage;

    constructor(
        readonly esaPeriod: number,
        readonly dPeriod: number,
        readonly averagePeriod: number,
    ) {
        super(['wt1', 'wt2']);
        integer(esaPeriod, esaPeriod, 1, 500, 'esaPeriod');
        integer(dPeriod, dPeriod, 1, 500, 'dPeriod');
        integer(averagePeriod, averagePeriod, 1, 500, 'averagePeriod');
        this.esa = new ExponentialMovingAverage(esaPeriod);
        this.deviation = new ExponentialMovingAverage(dPeriod);
        this.average = new PartialSeedSimpleMovingAverage(averagePeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        if (high === null || low === null || close === null) return this.empty(input.index);

        const typical = (high + low + close) / 3;
        const esa = commit ? this.esa.push(typical) : this.esa.preview(typical);
        if (esa === null || !this.esa.isFormed) return this.empty(input.index);

        const difference = Math.abs(typical - esa);
        const deviation = commit
            ? this.deviation.push(difference)
            : this.deviation.preview(difference);
        if (deviation === null || !this.deviation.isFormed
            || isPlatformZero(deviation, typical))
            return this.empty(input.index);

        const wt1 = (typical - esa) / (0.015 * deviation);
        const wt2 = commit ? this.average.push(wt1) : this.average.preview(wt1);
        return {
            isFormed: true,
            values: [
                this.formedOutput('wt1', wt1, true, input.index),
                this.formedOutput('wt2', wt2, true, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.esa.reset();
        this.deviation.reset();
        this.average.reset();
    }

    protected captureState(): WaveTrendOscillatorCheckpoint {
        return Object.freeze({
            esa: this.esa.checkpoint(),
            deviation: this.deviation.checkpoint(),
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: WaveTrendOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.average?.values)
            || state.average.values.length > this.averagePeriod
            || state.average.values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Wave Trend Oscillator checkpoint');
        }
        this.esa.restore(state.esa);
        this.deviation.restore(state.deviation);
        this.average.restore(state.average);
    }

    private empty(index: number): IndicatorCalculationResult {
        return {
            isFormed: false,
            values: [
                this.output('wt1', null, index),
                this.output('wt2', null, index),
            ],
        };
    }
}

export const WaveTrendOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    WaveTrendOscillatorParameters
> = registerIndicator({
    id: 'WaveTrendOscillator',
    name: 'Wave Trend Oscillator',
    description: 'Dual-line momentum oscillator derived from smoothed typical-price deviation.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'esaPeriod', name: 'ESA Period', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'dPeriod', name: 'Deviation Period', type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 500, step: 1,
        },
        {
            id: 'averagePeriod', name: 'Average Period',
            type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        { id: 'wt1', name: 'WT1', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'wt2', name: 'WT2', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['wto', 'wavetrend', 'wavetrendoscillator'],
    processorFactory: (parameters) => new WaveTrendOscillatorProcessor(
        integer(parameters?.esaPeriod, 10, 1, 500, 'esaPeriod'),
        integer(parameters?.dPeriod, 14, 1, 500, 'dPeriod'),
        integer(parameters?.averagePeriod, 3, 1, 500, 'averagePeriod'),
    ),
});
