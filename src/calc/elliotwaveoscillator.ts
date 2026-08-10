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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
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

export interface ElliotWaveOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface ElliotWaveOscillatorCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
}

export class ElliotWaveOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ElliotWaveOscillatorCheckpoint
> {
    private readonly short: SimpleMovingAverage;
    private readonly long: SimpleMovingAverage;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['line']);
        this.short = new SimpleMovingAverage(
            integer(shortPeriod, shortPeriod, 1, 500, 'shortPeriod'),
        );
        this.long = new SimpleMovingAverage(
            integer(longPeriod, longPeriod, 1, 500, 'longPeriod'),
        );
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = finite(input.value?.close);
        const short = commit ? this.short.push(value) : this.short.preview(value);
        const long = commit ? this.long.push(value) : this.long.preview(value);
        const oscillator = short === null || long === null ? null : short - long;
        return {
            isFormed: oscillator !== null,
            values: [this.output('line', oscillator, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): ElliotWaveOscillatorCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
        });
    }

    protected restoreState(state: ElliotWaveOscillatorCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint, maximum: number) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= maximum
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.short, this.shortPeriod)
            || !valid(state.long, this.longPeriod)) {
            throw new TypeError('sschart: invalid Elliot Wave Oscillator checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const ElliotWaveOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    ElliotWaveOscillatorParameters
> = registerIndicator({
    id: 'ElliotWaveOscillator',
    name: 'Elliot Wave Oscillator',
    description: 'Difference between short and long simple averages of closing price.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 34, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'Elliot Wave Oscillator',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#26a69a', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['ewo'],
    levels: [0],
    processorFactory: (parameters) => new ElliotWaveOscillatorProcessor(
        integer(parameters?.shortPeriod, 5, 1, 500, 'shortPeriod'),
        integer(parameters?.longPeriod, 34, 1, 500, 'longPeriod'),
    ),
});
