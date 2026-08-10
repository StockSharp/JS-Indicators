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
    finite,
    integer,
} from './shared/guards.js';

export interface OptimalTrackingParameters extends IndicatorParameters {
    readonly length: number;
}

export interface OptimalTrackingCheckpoint {
    readonly validCount: number;
    readonly previousAverage: number;
    readonly previousDifference: number;
    readonly previousHalfRange: number;
    readonly previousResult: number;
    readonly lambda: number;
}

export const OPTIMAL_TRACKING_DECAY = Math.exp(-0.25);

export const OPTIMAL_TRACKING_WEIGHT = 1 - OPTIMAL_TRACKING_DECAY;

export class OptimalTrackingProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    OptimalTrackingCheckpoint
> {
    private validCount = 0;
    private previousAverage = 0;
    private previousDifference = 0;
    private previousHalfRange = 0;
    private previousResult = 0;
    private lambda = 0;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        if (high === null || low === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const average = (high + low) / 2;
        const halfRange = (high - low) / 2;
        // The platform takes the average into its buffer and only then asks whether it is full, so
        // the bar that fills it is already a calculated one.
        const seen = this.validCount + 1;
        if (seen < this.length) {
            if (commit) {
                this.validCount = seen;
                this.previousAverage = average;
                this.previousHalfRange = halfRange;
                this.previousResult = average;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const difference = OPTIMAL_TRACKING_WEIGHT * (average - this.previousAverage)
            + OPTIMAL_TRACKING_DECAY * this.previousDifference;
        const range = OPTIMAL_TRACKING_WEIGHT * halfRange
            + OPTIMAL_TRACKING_DECAY * this.previousHalfRange;
        const lambda = range === 0 ? this.lambda : Math.abs(difference / range);
        const lambdaSquared = lambda * lambda;
        const alpha = (-lambdaSquared
            + Math.sqrt(lambdaSquared * lambdaSquared + 16 * lambdaSquared)) / 8;
        const value = alpha * average + (1 - alpha) * this.previousResult;

        if (commit) {
            this.validCount = seen < this.length ? seen : this.length;
            this.previousAverage = average;
            this.previousDifference = difference;
            this.previousHalfRange = range;
            this.previousResult = value;
            this.lambda = lambda;
        }
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.validCount = 0;
        this.previousAverage = 0;
        this.previousDifference = 0;
        this.previousHalfRange = 0;
        this.previousResult = 0;
        this.lambda = 0;
    }

    protected captureState(): OptimalTrackingCheckpoint {
        return Object.freeze({
            validCount: this.validCount,
            previousAverage: this.previousAverage,
            previousDifference: this.previousDifference,
            previousHalfRange: this.previousHalfRange,
            previousResult: this.previousResult,
            lambda: this.lambda,
        });
    }

    protected restoreState(state: OptimalTrackingCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Number.isInteger(state.validCount)
            || state.validCount < 0 || state.validCount > this.length
            || finite(state.previousAverage) === null
            || finite(state.previousDifference) === null
            || finite(state.previousHalfRange) === null
            || finite(state.previousResult) === null
            || finite(state.lambda) === null || state.lambda < 0) {
            throw new TypeError('sschart: invalid Optimal Tracking checkpoint');
        }
        this.validCount = state.validCount;
        this.previousAverage = state.previousAverage;
        this.previousDifference = state.previousDifference;
        this.previousHalfRange = state.previousHalfRange;
        this.previousResult = state.previousResult;
        this.lambda = state.lambda;
    }
}

export const OptimalTrackingIndicator: IndicatorDefinition<
    IndicatorCandle,
    OptimalTrackingParameters
> = registerIndicator({
    id: 'OptimalTracking',
    name: 'Optimal Tracking',
    description: 'Adaptive filter that tracks the candle midprice using its smoothed range.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 2, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'Optimal Tracking',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#26a69a',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['optimaltracking'],
    processorFactory: (parameters) => new OptimalTrackingProcessor(
        integer(parameters?.length, 2, 1, 500, 'length'),
    ),
});
