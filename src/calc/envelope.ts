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
    number,
} from './shared/guards.js';

export interface EnvelopeParameters extends IndicatorParameters {
    readonly length: number;
    readonly shift: number;
}

export class EnvelopeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number, readonly shift: number) {
        super(['upper', 'middle', 'lower']);
        this.average = new SimpleMovingAverage(length);
        number(shift, 0.01, 0, 100, 'shift');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const middle = commit ? this.average.push(close) : this.average.preview(close);
        return {
            isFormed: this.average.isFormed,
            values: [
                this.formedOutput('upper', middle === null ? null : middle * (1 + this.shift), this.average.isFormed, input.index),
                this.formedOutput('middle', middle, this.average.isFormed, input.index),
                this.formedOutput('lower', middle === null ? null : middle * (1 - this.shift), this.average.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const EnvelopeIndicator: IndicatorDefinition<
    IndicatorCandle,
    EnvelopeParameters
> = registerIndicator({
    id: 'Envelope',
    name: 'Envelope',
    description: 'Simple moving average with fixed percentage upper and lower bands.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 32, min: 1, max: 500, step: 1,
        },
        {
            id: 'shift', name: 'Shift', type: IndicatorParameterType.Number,
            defaultValue: 0.01, min: 0, max: 100, step: 0.0001,
        },
    ],
    outputs: [
        { id: 'upper', name: 'Upper', defaultStyle: style(IndicatorSeriesStyle.Band, '#26a69a') },
        { id: 'middle', name: 'Middle', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28', 2) },
        { id: 'lower', name: 'Lower', defaultStyle: style(IndicatorSeriesStyle.Band, '#26a69a') },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['envelope'],
    painter: 'band',
    processorFactory: (parameters) => new EnvelopeProcessor(
        integer(parameters?.length, 32, 1, 500, 'length'),
        number(parameters?.shift, 0.01, 0, 100, 'shift'),
    ),
});
