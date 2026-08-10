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
    LENGTH_STYLE,
    close,
    resolvedLength,
} from './shared/core.js';

export interface KalmanFilterParameters extends IndicatorParameters {
    readonly length: number;
    readonly processNoise: number;
    readonly measurementNoise: number;
}

export interface KalmanFilterCheckpoint {
    readonly lastEstimate: number | null;
    readonly errorCovariance: number;
    readonly count: number;
}

export function resolvedPositive(value: unknown, fallback: number, name: string): number {
    const resolved = value ?? fallback;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved) || resolved <= 0) {
        throw new RangeError(`sschart: indicator ${name} must be a positive finite number`);
    }
    return resolved;
}

export class KalmanFilterProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KalmanFilterCheckpoint
> {
    private lastEstimate: number | null = null;
    private errorCovariance = 1;
    private count = 0;

    constructor(
        readonly length: number,
        readonly processNoise: number,
        readonly measurementNoise: number,
    ) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Kalman Filter length must be an integer from 1 to 500',
            );
        }
        if (!Number.isFinite(processNoise) || processNoise <= 0) {
            throw new RangeError('sschart: Kalman Filter process noise must be positive and finite');
        }
        if (!Number.isFinite(measurementNoise) || measurementNoise <= 0) {
            throw new RangeError(
                'sschart: Kalman Filter measurement noise must be positive and finite',
            );
        }
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const measurement = close(input);
        if (measurement === null) {
            return {
                isFormed: this.count >= this.length,
                values: [this.output('line', null, input.index)],
            };
        }

        let estimate = measurement;
        let nextErrorCovariance = 1;
        if (this.lastEstimate !== null) {
            const priorErrorCovariance = this.errorCovariance + this.processNoise;
            const kalmanGain = priorErrorCovariance
                / (priorErrorCovariance + this.measurementNoise);
            estimate = this.lastEstimate + kalmanGain * (measurement - this.lastEstimate);
            nextErrorCovariance = (1 - kalmanGain) * priorErrorCovariance;
        }
        const nextCount = Math.min(this.length, this.count + 1);
        if (commit) {
            this.lastEstimate = estimate;
            this.errorCovariance = nextErrorCovariance;
            this.count = nextCount;
        }
        const formed = nextCount >= this.length;
        return {
            isFormed: formed,
            values: [this.output('line', formed ? estimate : null, input.index)],
        };
    }

    protected resetState(): void {
        this.lastEstimate = null;
        this.errorCovariance = 1;
        this.count = 0;
    }

    protected captureState(): KalmanFilterCheckpoint {
        return Object.freeze({
            lastEstimate: this.lastEstimate,
            errorCovariance: this.errorCovariance,
            count: this.count,
        });
    }

    protected restoreState(state: KalmanFilterCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.lastEstimate !== null
                && (typeof state.lastEstimate !== 'number'
                    || !Number.isFinite(state.lastEstimate)))
            || typeof state.errorCovariance !== 'number'
            || !Number.isFinite(state.errorCovariance) || state.errorCovariance < 0
            || !Number.isInteger(state.count) || state.count < 0 || state.count > this.length
            || (state.count === 0) !== (state.lastEstimate === null)) {
            throw new TypeError('sschart: invalid Kalman Filter checkpoint');
        }
        this.lastEstimate = state.lastEstimate;
        this.errorCovariance = state.errorCovariance;
        this.count = state.count;
    }
}

export const KalmanFilterIndicator: IndicatorDefinition<
    IndicatorCandle,
    KalmanFilterParameters
> = registerIndicator({
    id: 'KalmanFilter',
    name: 'Kalman Filter',
    description: 'Adaptive one-dimensional price estimate with configurable process and measurement noise.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'processNoise', name: 'Process Noise', type: IndicatorParameterType.Number,
            defaultValue: 0.00001, min: 1e-12, max: 1e12, step: 0.00001,
        },
        {
            id: 'measurementNoise', name: 'Measurement Noise',
            type: IndicatorParameterType.Number,
            defaultValue: 0.001, min: 1e-12, max: 1e12, step: 0.001,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'Kalman',
        defaultStyle: { ...LENGTH_STYLE, color: '#26a69a' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['kalman', 'kalmanfilter'],
    processorFactory: (parameters) => new KalmanFilterProcessor(
        resolvedLength(parameters, 10, 1),
        resolvedPositive(parameters?.processNoise, 0.00001, 'processNoise'),
        resolvedPositive(parameters?.measurementNoise, 0.001, 'measurementNoise'),
    ),
});
