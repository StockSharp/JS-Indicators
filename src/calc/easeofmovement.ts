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
    RollingSum,
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

export interface EaseOfMovementCheckpoint {
    readonly previousHigh: number;
    readonly previousLow: number;
    readonly values: RollingWindowCheckpoint;
}

export class EaseOfMovementProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    EaseOfMovementCheckpoint
> {
    private previousHigh = 0;
    private previousLow = 0;
    private readonly values: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: EOM length must be a positive integer');
        this.values = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const volume = finite(input.value?.volume);
        const valid = high !== null && low !== null && volume !== null;
        const range = valid ? high - low : 0;
        const canCalculate = valid && this.previousHigh !== 0 && this.previousLow !== 0
            && range !== 0 && volume !== 0;
        let average: number | null = null;
        if (canCalculate) {
            const midpointMove = (high + low) / 2
                - (this.previousHigh + this.previousLow) / 2;
            const emv = finite(midpointMove * range / volume);
            if (emv !== null) {
                const sum = commit ? this.values.push(emv) : this.values.preview(emv);
                average = sum === null ? null : finite(sum / this.length);
            }
        }

        if (commit && average === null && valid) {
            this.previousHigh = high;
            this.previousLow = low;
        }
        return {
            isFormed: average !== null,
            values: [this.output('line', average, input.index)],
        };
    }

    protected resetState(): void {
        this.previousHigh = 0;
        this.previousLow = 0;
        this.values.reset();
    }

    protected captureState(): EaseOfMovementCheckpoint {
        return Object.freeze({
            previousHigh: this.previousHigh,
            previousLow: this.previousLow,
            values: this.values.checkpoint(),
        });
    }

    protected restoreState(state: EaseOfMovementCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousHigh) === null || finite(state.previousLow) === null) {
            throw new TypeError('sschart: invalid Ease Of Movement checkpoint');
        }
        this.values.restore(state.values);
        this.previousHigh = state.previousHigh;
        this.previousLow = state.previousLow;
    }
}

export const EaseOfMovementIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'EaseOfMovement',
    name: 'Ease Of Movement',
    description: 'Smoothed midpoint movement scaled by candle range and volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'EOM', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['eom'],
    levels: [0],
    processorFactory: (parameters) => new EaseOfMovementProcessor(
        resolvedLength(parameters, 14),
    ),
});
