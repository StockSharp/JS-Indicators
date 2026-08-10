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
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface MovingAverageConvergenceDivergenceParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
}

export interface MovingAverageConvergenceDivergenceCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}

export class MovingAverageConvergenceDivergenceProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MovingAverageConvergenceDivergenceCheckpoint
> {
    private readonly short: FiniteExponentialAverage;
    private readonly long: FiniteExponentialAverage;

    constructor(
        readonly shortMaLength: number,
        readonly longMaLength: number,
    ) {
        super(['macd']);
        this.short = new FiniteExponentialAverage(shortMaLength);
        this.long = new FiniteExponentialAverage(longMaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit ? this.short.push(close) : this.short.preview(close);
        const long = commit ? this.long.push(close) : this.long.preview(close);
        const macd = short === null || long === null ? null : short - long;
        return {
            isFormed: macd !== null,
            values: [this.output('macd', macd, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): MovingAverageConvergenceDivergenceCheckpoint {
        return Object.freeze({ short: this.short.checkpoint(), long: this.long.checkpoint() });
    }

    protected restoreState(state: MovingAverageConvergenceDivergenceCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid MACD checkpoint');
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const MovingAverageConvergenceDivergenceIndicator: IndicatorDefinition<
    IndicatorCandle,
    MovingAverageConvergenceDivergenceParameters
> = registerIndicator({
    id: 'MovingAverageConvergenceDivergence',
    name: 'MACD',
    description: 'Difference between a fast and a slow exponential moving average.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortMaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 500, step: 1,
        },
        {
            id: 'longMaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        { id: 'macd', name: 'MACD', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['macd'],
    painter: 'line',
    processorFactory: (parameters) => new MovingAverageConvergenceDivergenceProcessor(
        integer(parameters?.shortMaLength, 12, 1, 500, 'shortMaLength'),
        integer(parameters?.longMaLength, 26, 1, 500, 'longMaLength'),
    ),
});
