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
    LinearWeightedMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface HullMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly sqrtPeriod: number;
}

export interface HullMovingAverageCheckpoint {
    readonly slow: RollingWindowCheckpoint;
    readonly fast: RollingWindowCheckpoint;
    readonly result: RollingWindowCheckpoint;
}

export class HullMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    HullMovingAverageCheckpoint
> {
    readonly halfLength: number;
    readonly resultLength: number;
    private readonly slow: LinearWeightedMovingAverage;
    private readonly fast: LinearWeightedMovingAverage;
    private readonly result: LinearWeightedMovingAverage;

    constructor(readonly length: number, readonly sqrtPeriod: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        integer(sqrtPeriod, sqrtPeriod, 0, 500, 'sqrtPeriod');
        this.halfLength = Math.floor(length / 2);
        this.resultLength = sqrtPeriod > 0 ? sqrtPeriod : Math.floor(Math.sqrt(length));
        this.slow = new LinearWeightedMovingAverage(length);
        this.fast = new LinearWeightedMovingAverage(Math.max(1, this.halfLength));
        this.result = new LinearWeightedMovingAverage(Math.max(1, this.resultLength));
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        if (this.halfLength === 0 || this.resultLength === 0) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        const close = finite(input.value?.close);
        const slow = commit ? this.slow.push(close) : this.slow.preview(close);
        const fast = commit ? this.fast.push(close) : this.fast.preview(close);
        const raw = slow === null || fast === null ? null : 2 * fast - slow;
        const value = commit ? this.result.push(raw) : this.result.preview(raw);
        return {
            isFormed: this.result.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.slow.reset();
        this.fast.reset();
        this.result.reset();
    }
    protected captureState(): HullMovingAverageCheckpoint {
        return Object.freeze({
            slow: this.slow.checkpoint(),
            fast: this.fast.checkpoint(),
            result: this.result.checkpoint(),
        });
    }
    protected restoreState(state: HullMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid HMA checkpoint');
        this.slow.restore(state.slow);
        this.fast.restore(state.fast);
        this.result.restore(state.result);
    }
}

export const HullMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    HullMovingAverageParameters
> = registerIndicator({
    id: 'HullMovingAverage',
    name: 'Hull Moving Average',
    description: 'Hull cascade of fast, slow and result linear weighted averages.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'sqrtPeriod', name: 'Result Period', type: IndicatorParameterType.Integer,
            defaultValue: 0, min: 0, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'HMA',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#66bb6a', 2),
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['hma'],
    processorFactory: (parameters) => new HullMovingAverageProcessor(
        integer(parameters?.length, 10, 1, 500, 'length'),
        integer(parameters?.sqrtPeriod, 0, 0, 500, 'sqrtPeriod'),
    ),
});
