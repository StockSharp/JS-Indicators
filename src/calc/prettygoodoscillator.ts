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
    RollingMaximum,
    RollingMinimum,
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface PrettyGoodOscillatorCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
}

export class PrettyGoodOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PrettyGoodOscillatorCheckpoint
> {
    private readonly average: SimpleMovingAverage;
    private readonly highest: RollingMaximum;
    private readonly lowest: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.average = new SimpleMovingAverage(length);
        this.highest = new RollingMaximum(length);
        this.lowest = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const average = commit ? this.average.push(close) : this.average.preview(close);
        const highest = commit ? this.highest.push(high) : this.highest.preview(high);
        const lowest = commit ? this.lowest.push(low) : this.lowest.preview(low);
        const range = highest === null || lowest === null ? null : highest - lowest;
        const value = close === null || average === null || range === null || range === 0
            ? null
            : finite((close - average) / range * 100);
        return {
            isFormed: this.average.isFormed
                && this.highest.isFormed && this.lowest.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.average.reset();
        this.highest.reset();
        this.lowest.reset();
    }

    protected captureState(): PrettyGoodOscillatorCheckpoint {
        return Object.freeze({
            average: this.average.checkpoint(),
            highest: this.highest.checkpoint(),
            lowest: this.lowest.checkpoint(),
        });
    }

    protected restoreState(state: PrettyGoodOscillatorCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.average) || !valid(state.highest) || !valid(state.lowest)) {
            throw new TypeError('sschart: invalid Pretty Good Oscillator checkpoint');
        }
        this.average.restore(state.average);
        this.highest.restore(state.highest);
        this.lowest.restore(state.lowest);
    }
}

export const PrettyGoodOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'PrettyGoodOscillator',
    name: 'Pretty Good Oscillator',
    description: 'Close displacement from its average normalized by the rolling candle range.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{
        id: 'line', name: 'PGO',
        defaultStyle: lineStyle('#7e57c2'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['pgo', 'prettygoodoscillator'],
    levels: [0],
    processorFactory: (parameters) => new PrettyGoodOscillatorProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
    ),
});
