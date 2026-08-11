import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    RingBuffer,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface MomentumOfMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly momentumPeriod: number;
}

export interface MomentumOfMovingAverageCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
    readonly sum: number;
}

export class MomentumOfMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MomentumOfMovingAverageCheckpoint
> {
    private readonly values: RingBuffer<number>;
    private sum = 0;

    constructor(readonly length: number, readonly momentumPeriod: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        resolvedPeriod(momentumPeriod, momentumPeriod, 'momentumPeriod');
        this.values = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        if (price === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        let value: number | null = null;
        if (commit) {
            this.push(price);
            const average = this.sum / this.length;
            if (this.values.full) {
                this.push(average);
                const first = this.values.front() as number;
                if (first !== 0) value = finite((average - first) / first * 100);
            }
        } else {
            if (this.values.full && this.values.size >= 2) {
                const average = (this.sum - (this.values.front() as number) + price)
                    / this.length;
                const first = this.values.at(1) as number;
                if (first !== 0) value = finite((average - first) / first * 100);
            }
        }

        return {
            isFormed: this.values.full,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.sum = 0;
    }

    protected captureState(): MomentumOfMovingAverageCheckpoint {
        return Object.freeze({ values: this.values.checkpoint(), sum: this.sum });
    }

    protected restoreState(state: MomentumOfMovingAverageCheckpoint): void {
        const values = state?.values?.values;
        const rebuiltSum = Array.isArray(values)
            ? values.reduce((sum, value) => sum + value, 0)
            : 0;
        const tolerance = Math.max(1, Math.abs(rebuiltSum)) * Number.EPSILON * 128;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)
            || finite(state.sum) === null
            || Math.abs(state.sum - rebuiltSum) > tolerance) {
            throw new TypeError('sschart: invalid Momentum Of Moving Average checkpoint');
        }
        this.values.restore(state.values);
        this.sum = state.sum;
    }

    private push(value: number): void {
        if (this.values.full) this.sum -= this.values.front() as number;
        this.values.push(value);
        this.sum += value;
    }
}

export const MomentumOfMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumOfMovingAverageParameters
> = registerIndicator({
    id: 'MomentumOfMovingAverage',
    name: 'Momentum Of Moving Average',
    description: 'StockSharp-compatible momentum of its shared moving-average buffer.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        lengthParameter(14),
        {
            id: 'momentumPeriod',
            name: 'Momentum Period',
            description: 'Compatibility setting retained by StockSharp; it does not alter the formula.',
            type: IndicatorParameterType.Integer,
            defaultValue: 10,
            min: 1,
            max: 500,
            step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'Momentum Of Moving Average',
        defaultStyle: lineStyle('#42a5f5'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['momma', 'momentumofmovingaverage'],
    levels: [0],
    processorFactory: (parameters) => new MomentumOfMovingAverageProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
        resolvedPeriod(parameters?.momentumPeriod, 10, 'momentumPeriod'),
    ),
});
