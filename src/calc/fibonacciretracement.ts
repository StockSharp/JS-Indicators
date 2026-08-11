import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface FibonacciRetracementCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export const FIBONACCI_LEVELS = Object.freeze([
    { id: 'l236', name: '23.6%', ratio: 0.236, color: '#ef5350' },
    { id: 'l382', name: '38.2%', ratio: 0.382, color: '#ffb74d' },
    { id: 'l500', name: '50.0%', ratio: 0.5, color: '#ffee58' },
    { id: 'l618', name: '61.8%', ratio: 0.618, color: '#66bb6a' },
    { id: 'l786', name: '78.6%', ratio: 0.786, color: '#42a5f5' },
] as const);

export class FibonacciRetracementProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    FibonacciRetracementCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(FIBONACCI_LEVELS.map((level) => level.id));
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Fibonacci Retracement length must be an integer from 1 to 500',
            );
        }
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        let maximum: number | null;
        let minimum: number | null;
        if (commit) {
            this.high.push(finite(input.value?.high));
            this.low.push(finite(input.value?.low));
            maximum = this.high.partialValue;
            minimum = this.low.partialValue;
        } else {
            maximum = this.high.previewPartial(finite(input.value?.high));
            minimum = this.low.previewPartial(finite(input.value?.low));
        }

        const formed = maximum !== null && minimum !== null;
        const upper = maximum ?? 0;
        const lower = minimum ?? 0;
        const range = upper - lower;
        return {
            isFormed: formed,
            values: FIBONACCI_LEVELS.map((level) => this.output(
                level.id,
                formed ? lower + range * level.ratio : null,
                input.index,
            )),
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }

    protected captureState(): FibonacciRetracementCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }

    protected restoreState(state: FibonacciRetracementCheckpoint): void {
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
            throw new TypeError('sschart: invalid Fibonacci Retracement checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const FibonacciRetracementIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'FibonacciRetracement',
    name: 'Fibonacci Retracement',
    description: 'Five retracement prices between the rolling low and high.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 20, min: 1, max: 500, step: 1,
    }],
    outputs: FIBONACCI_LEVELS.map((level) => ({
        id: level.id,
        name: level.name,
        defaultStyle: lineStyle(level.color, 1),
    })),
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['fibo'],
    processorFactory: (parameters) => new FibonacciRetracementProcessor(
        length(parameters?.length, 20),
    ),
});
