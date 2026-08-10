import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
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
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface StochasticKCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export class StochasticKProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    StochasticKCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Stochastic K length must be an integer from 1 to 500',
            );
        }
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = commit
            ? this.high.push(finite(input.value?.high))
            : this.high.preview(finite(input.value?.high));
        const low = commit
            ? this.low.push(finite(input.value?.low))
            : this.low.preview(finite(input.value?.low));
        const close = finite(input.value?.close);
        let value: number | null = null;
        if (high !== null && low !== null && close !== null) {
            const range = high - low;
            value = range === 0 ? 0 : finite(100 * (close - low) / range);
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }

    protected captureState(): StochasticKCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }

    protected restoreState(state: StochasticKCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.high) || !valid(state.low)
            || state.high.values.length !== state.low.values.length) {
            throw new TypeError('sschart: invalid Stochastic K checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const StochasticKIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'StochasticK',
    name: 'Stochastic K',
    description: 'Close position within the trailing high-low range as raw stochastic %K.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: '%K', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['stochastick'],
    scaleRange: { min: 0, max: 100 },
    levels: [20, 80],
    processorFactory: (parameters) => new StochasticKProcessor(
        resolvedLength(parameters, 14),
    ),
});
