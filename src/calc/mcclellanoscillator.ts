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
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface McClellanOscillatorParameters extends IndicatorParameters {
    readonly ema19Length: number;
    readonly ema39Length: number;
}

export interface McClellanOscillatorCheckpoint {
    readonly short: SeededMovingAverageCheckpoint;
    readonly long: SeededMovingAverageCheckpoint;
}

export class McClellanOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    McClellanOscillatorCheckpoint
> {
    private readonly short: ExponentialMovingAverage;
    private readonly long: ExponentialMovingAverage;

    constructor(readonly ema19Length: number, readonly ema39Length: number) {
        super(['line']);
        integer(ema19Length, ema19Length, 1, 500, 'ema19Length');
        integer(ema39Length, ema39Length, 1, 500, 'ema39Length');
        this.short = new ExponentialMovingAverage(ema19Length);
        this.long = new ExponentialMovingAverage(ema39Length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit ? this.short.push(close) : this.short.preview(close);
        const long = commit ? this.long.push(close) : this.long.preview(close);
        const value = short === null || long === null ? null : finite(short - long);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): McClellanOscillatorCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
        });
    }

    protected restoreState(state: McClellanOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid McClellan Oscillator checkpoint');
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const McClellanOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    McClellanOscillatorParameters
> = registerIndicator({
    id: 'McClellanOscillator',
    name: 'McClellan Oscillator',
    description: 'Difference between short and long exponential moving averages.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'ema19Length', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 19, min: 1, max: 500, step: 1,
        },
        {
            id: 'ema39Length', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 39, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'McClellan Oscillator',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['mcclellanosc', 'mcclellanoscillator'],
    levels: [0],
    processorFactory: (parameters) => new McClellanOscillatorProcessor(
        integer(parameters?.ema19Length, 19, 1, 500, 'ema19Length'),
        integer(parameters?.ema39Length, 39, 1, 500, 'ema39Length'),
    ),
});
