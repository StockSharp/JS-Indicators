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
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface AwesomeOscillatorParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
}

export interface AwesomeOscillatorCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
    readonly previous: number | null;
}

export class AwesomeOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AwesomeOscillatorCheckpoint
> {
    private readonly short: SimpleMovingAverage;
    private readonly long: SimpleMovingAverage;
    private previous: number | null = null;

    constructor(readonly shortMaLength: number, readonly longMaLength: number) {
        super(['value']);
        this.short = new SimpleMovingAverage(shortMaLength);
        this.long = new SimpleMovingAverage(longMaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const median = high === null || low === null ? null : (high + low) / 2;
        const short = commit ? this.short.push(median) : this.short.preview(median);
        const long = commit ? this.long.push(median) : this.long.preview(median);
        const value = short === null || long === null ? null : short - long;
        const up = value === null || this.previous === null ? true : value >= this.previous;
        if (commit && value !== null) this.previous = value;
        return {
            isFormed: this.long.isFormed,
            values: [this.output('value', value, input.index, { up })],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
        this.previous = null;
    }
    protected captureState(): AwesomeOscillatorCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
            previous: this.previous,
        });
    }
    protected restoreState(state: AwesomeOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.previous !== null && finite(state.previous) === null)) {
            throw new TypeError('sschart: invalid Awesome Oscillator checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
        this.previous = state.previous;
    }
}

export const AwesomeOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    AwesomeOscillatorParameters
> = registerIndicator({
    id: 'AwesomeOscillator',
    name: 'Awesome Oscillator',
    description: 'Difference between short and long moving averages of median price.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortMaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'longMaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 34, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'value',
        name: 'Awesome Oscillator',
        defaultStyle: style(IndicatorSeriesStyle.Histogram, '#00c853'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['ao', 'awesomeoscillator'],
    painter: 'directional-histogram',
    levels: [0],
    processorFactory: (parameters) => new AwesomeOscillatorProcessor(
        integer(parameters?.shortMaLength, 5, 1, 500, 'shortMaLength'),
        integer(parameters?.longMaLength, 34, 1, 500, 'longMaLength'),
    ),
});
