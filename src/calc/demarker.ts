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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface DeMarkerCheckpoint {
    readonly previousHigh: number | null;
    readonly previousLow: number | null;
    readonly deMax: RollingWindowCheckpoint;
    readonly deMin: RollingWindowCheckpoint;
}

export class DeMarkerProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DeMarkerCheckpoint
> {
    private previousHigh: number | null = null;
    private previousLow: number | null = null;
    private readonly deMax: SimpleMovingAverage;
    private readonly deMin: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.deMax = new SimpleMovingAverage(length);
        this.deMin = new SimpleMovingAverage(length);
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

        if (this.previousHigh === null || this.previousLow === null) {
            if (commit) {
                this.previousHigh = high;
                this.previousLow = low;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const currentDeMax = high > this.previousHigh ? high - this.previousHigh : 0;
        const currentDeMin = low < this.previousLow ? this.previousLow - low : 0;
        const averageDeMax = commit
            ? this.deMax.push(currentDeMax)
            : this.deMax.preview(currentDeMax);
        const averageDeMin = commit
            ? this.deMin.push(currentDeMin)
            : this.deMin.preview(currentDeMin);
        if (commit) {
            this.previousHigh = high;
            this.previousLow = low;
        }

        const denominator = averageDeMax === null || averageDeMin === null
            ? null
            : averageDeMax + averageDeMin;
        const value = denominator === null
            ? null
            : denominator === 0 ? 0.5 : averageDeMax! / denominator;
        return {
            isFormed: this.deMax.isFormed && this.deMin.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousHigh = null;
        this.previousLow = null;
        this.deMax.reset();
        this.deMin.reset();
    }

    protected captureState(): DeMarkerCheckpoint {
        return Object.freeze({
            previousHigh: this.previousHigh,
            previousLow: this.previousLow,
            deMax: this.deMax.checkpoint(),
            deMin: this.deMin.checkpoint(),
        });
    }

    protected restoreState(state: DeMarkerCheckpoint): void {
        const validWindow = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => finite(value) !== null)
        );
        const seeded = state?.previousHigh !== null && state?.previousLow !== null;
        if (state === null || typeof state !== 'object'
            || (state.previousHigh !== null && finite(state.previousHigh) === null)
            || (state.previousLow !== null && finite(state.previousLow) === null)
            || ((state.previousHigh === null) !== (state.previousLow === null))
            || !validWindow(state.deMax) || !validWindow(state.deMin)
            || state.deMax.values.length !== state.deMin.values.length
            || (!seeded && state.deMax.values.length !== 0)) {
            throw new TypeError('sschart: invalid DeMarker checkpoint');
        }
        this.deMax.restore(state.deMax);
        this.deMin.restore(state.deMin);
        this.previousHigh = state.previousHigh;
        this.previousLow = state.previousLow;
    }
}

export const DeMarkerIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'DeMarker',
    name: 'De Marker',
    description: 'Ratio of recent upward high movement to combined high and low movement.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'De Marker', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['demarker'],
    scaleRange: { min: 0, max: 1 },
    levels: [0.3, 0.7],
    processorFactory: (parameters) => new DeMarkerProcessor(resolvedLength(parameters, 14)),
});
