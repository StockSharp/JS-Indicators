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

export interface PercentagePriceOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface PercentagePriceOscillatorCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}

export class PercentagePriceOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PercentagePriceOscillatorCheckpoint
> {
    private readonly short: FiniteExponentialAverage;
    private readonly long: FiniteExponentialAverage;

    constructor(
        readonly shortPeriod: number,
        readonly longPeriod: number,
    ) {
        super(['ppo']);
        this.short = new FiniteExponentialAverage(shortPeriod);
        this.long = new FiniteExponentialAverage(longPeriod);
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
        return {
            isFormed: this.short.isFormed && this.long.isFormed,
            values: [this.output('ppo', ppo, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): PercentagePriceOscillatorCheckpoint {
        return Object.freeze({ short: this.short.checkpoint(), long: this.long.checkpoint() });
    }

    protected restoreState(state: PercentagePriceOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Percentage Price Oscillator checkpoint');
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const PercentagePriceOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    PercentagePriceOscillatorParameters
> = registerIndicator({
    id: 'PercentagePriceOscillator',
    name: 'PPO',
    description: 'Percentage difference between a short and a long exponential moving average.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 200, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 400, step: 1,
        },
    ],
    outputs: [
        { id: 'ppo', name: 'PPO', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['ppo'],
    painter: 'line',
    levels: [0],
    processorFactory: (parameters) => new PercentagePriceOscillatorProcessor(
        integer(parameters?.shortPeriod, 12, 1, 200, 'shortPeriod'),
        integer(parameters?.longPeriod, 26, 1, 400, 'longPeriod'),
    ),
});
