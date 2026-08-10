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

export interface HighLowIndexCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export class HighLowIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    HighLowIndexCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: High Low Index length must be an integer from 1 to 500',
            );
        }
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const currentHigh = finite(input.value?.high);
        const currentLow = finite(input.value?.low);
        const maximum = commit
            ? this.high.push(currentHigh)
            : this.high.preview(currentHigh);
        const minimum = commit
            ? this.low.push(currentLow)
            : this.low.preview(currentLow);
        let value: number | null = null;
        if (maximum !== null && minimum !== null && currentHigh !== null) {
            const range = maximum - minimum;
            value = range === 0 ? 50 : finite((currentHigh - minimum) / range * 100);
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

    protected captureState(): HighLowIndexCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }

    protected restoreState(state: HighLowIndexCheckpoint): void {
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
            throw new TypeError('sschart: invalid High Low Index checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const HighLowIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'HighLowIndex',
    name: 'High Low Index',
    description: 'Current high position within the trailing high-low range.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'High Low Index', defaultStyle: lineStyle('#26c6da') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['highlowindex'],
    scaleRange: { min: 0, max: 100 },
    levels: [50],
    processorFactory: (parameters) => new HighLowIndexProcessor(
        resolvedLength(parameters, 14),
    ),
});
