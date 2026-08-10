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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface OscillatorOfMovingAverageParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface OscillatorOfMovingAverageCheckpoint {
    readonly shortAverage: RollingWindowCheckpoint;
    readonly longAverage: RollingWindowCheckpoint;
}

export class OscillatorOfMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    OscillatorOfMovingAverageCheckpoint
> {
    private readonly shortAverage: SimpleMovingAverage;
    private readonly longAverage: SimpleMovingAverage;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['line']);
        resolvedPeriod(shortPeriod, shortPeriod, 'shortPeriod');
        resolvedPeriod(longPeriod, longPeriod, 'longPeriod');
        this.shortAverage = new SimpleMovingAverage(shortPeriod);
        this.longAverage = new SimpleMovingAverage(longPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit
            ? this.shortAverage.push(close)
            : this.shortAverage.preview(close);
        const long = commit
            ? this.longAverage.push(close)
            : this.longAverage.preview(close);
        const value = short === null || long === null
            ? null
            : long === 0 ? 0 : finite((short - long) / long * 100);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.shortAverage.reset();
        this.longAverage.reset();
    }

    protected captureState(): OscillatorOfMovingAverageCheckpoint {
        return Object.freeze({
            shortAverage: this.shortAverage.checkpoint(),
            longAverage: this.longAverage.checkpoint(),
        });
    }

    protected restoreState(state: OscillatorOfMovingAverageCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint, maximum: number) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= maximum
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.shortAverage, this.shortPeriod)
            || !valid(state.longAverage, this.longPeriod)) {
            throw new TypeError('sschart: invalid Oscillator Of Moving Average checkpoint');
        }
        this.shortAverage.restore(state.shortAverage);
        this.longAverage.restore(state.longAverage);
    }
}

export const OscillatorOfMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    OscillatorOfMovingAverageParameters
> = registerIndicator({
    id: 'OscillatorOfMovingAverage',
    name: 'Oscillator Of Moving Average',
    description: 'Percentage divergence between short and long simple moving averages.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 30, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'Oscillator Of Moving Average',
        defaultStyle: lineStyle('#42a5f5'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['osma', 'oscillatorofmovingaverage'],
    levels: [0],
    processorFactory: (parameters) => new OscillatorOfMovingAverageProcessor(
        resolvedPeriod(parameters?.shortPeriod, 10, 'shortPeriod'),
        resolvedPeriod(parameters?.longPeriod, 30, 'longPeriod'),
    ),
});
