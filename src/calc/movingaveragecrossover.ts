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

export interface MovingAverageCrossoverParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface MovingAverageCrossoverCheckpoint {
    readonly fast: RollingWindowCheckpoint;
    readonly slow: RollingWindowCheckpoint;
}

export class MovingAverageCrossoverProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MovingAverageCrossoverCheckpoint
> {
    private readonly fast: SimpleMovingAverage;
    private readonly slow: SimpleMovingAverage;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['signal']);
        integer(shortPeriod, shortPeriod, 1, 500, 'shortPeriod');
        integer(longPeriod, longPeriod, 1, 500, 'longPeriod');
        this.fast = new SimpleMovingAverage(shortPeriod);
        this.slow = new SimpleMovingAverage(longPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const fast = commit ? this.fast.push(close) : this.fast.preview(close);
        const slow = commit ? this.slow.push(close) : this.slow.preview(close);
        const signal = fast === null || slow === null
            ? null
            : (fast > slow ? 1 : (fast < slow ? -1 : 0));
        return {
            isFormed: this.fast.isFormed && this.slow.isFormed,
            values: [this.output('signal', signal, input.index)],
        };
    }

    protected resetState(): void {
        this.fast.reset();
        this.slow.reset();
    }

    protected captureState(): MovingAverageCrossoverCheckpoint {
        return Object.freeze({
            fast: this.fast.checkpoint(),
            slow: this.slow.checkpoint(),
        });
    }

    protected restoreState(state: MovingAverageCrossoverCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Moving Average Crossover checkpoint');
        this.fast.restore(state.fast);
        this.slow.restore(state.slow);
    }
}

export const MovingAverageCrossoverIndicator: IndicatorDefinition<
    IndicatorCandle,
    MovingAverageCrossoverParameters
> = registerIndicator({
    id: 'MovingAverageCrossover',
    name: 'Moving Average Crossover',
    description: 'Sign of the difference between fast and slow simple moving averages.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 25, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 50, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'signal', name: 'Signal',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['macross', 'movingaveragecrossover'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new MovingAverageCrossoverProcessor(
        integer(parameters?.shortPeriod, 25, 1, 500, 'shortPeriod'),
        integer(parameters?.longPeriod, 50, 1, 500, 'longPeriod'),
    ),
});
