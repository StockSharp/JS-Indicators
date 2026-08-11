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
    RollingMaximum,
    RollingMinimum,
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

export interface StochasticParameters extends IndicatorParameters {
    readonly kLength: number;
    readonly dLength: number;
}

export interface StochasticCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
    readonly d: RollingWindowCheckpoint;
}

export class StochasticProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    StochasticCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;
    private readonly d: SimpleMovingAverage;

    constructor(
        readonly kLength: number,
        readonly dLength: number,
    ) {
        super(['k', 'd']);
        this.high = new RollingMaximum(kLength);
        this.low = new RollingMinimum(kLength);
        this.d = new SimpleMovingAverage(dLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const currentHigh = finite(input.value?.high);
        const currentLow = finite(input.value?.low);
        const close = finite(input.value?.close);
        const high = commit ? this.high.push(currentHigh) : this.high.preview(currentHigh);
        const low = commit ? this.low.push(currentLow) : this.low.preview(currentLow);
        const range = high === null || low === null ? null : high - low;
        const k = range === null || close === null
            ? null
            : range === 0 ? 0 : 100 * (close - low!) / range;
        const d = commit ? this.d.push(k) : this.d.preview(k);
        return {
            isFormed: this.d.isFormed,
            values: [
                this.formedOutput('k', k, this.high.isFormed && this.low.isFormed, input.index),
                this.formedOutput('d', d, this.d.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
        this.d.reset();
    }
    protected captureState(): StochasticCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
            d: this.d.checkpoint(),
        });
    }
    protected restoreState(state: StochasticCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.high?.values?.length !== state.low?.values?.length) {
            throw new TypeError('sschart: invalid stochastic checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
        this.d.restore(state.d);
    }
}

export const StochasticIndicator: IndicatorDefinition<
    IndicatorCandle,
    StochasticParameters
> = registerIndicator({
    id: 'StochasticOscillator',
    name: 'Stochastic',
    description: 'Close position inside the rolling high-low range, with its moving average.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'kLength', name: 'K Period', type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 200, step: 1,
        },
        {
            id: 'dLength', name: 'D Period', type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 100, step: 1,
        },
    ],
    outputs: [
        { id: 'k', name: '%K', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'd', name: '%D', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['stochastic'],
    painter: 'stochastic',
    scaleRange: { min: 0, max: 100 },
    levels: [20, 80],
    processorFactory: (parameters) => new StochasticProcessor(
        integer(parameters?.kLength, 14, 1, 200, 'kLength'),
        integer(parameters?.dLength, 3, 1, 100, 'dLength'),
    ),
});
