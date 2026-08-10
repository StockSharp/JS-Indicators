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
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
    number,
} from './shared/guards.js';

export interface VortexIndicatorCheckpoint {
    readonly previousHigh: number | null;
    readonly previousLow: number | null;
    readonly previousClose: number | null;
    readonly trueRange: RollingWindowCheckpoint;
    readonly positiveMovement: RollingWindowCheckpoint;
    readonly negativeMovement: RollingWindowCheckpoint;
}

export class VortexIndicatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VortexIndicatorCheckpoint
> {
    private previousHigh: number | null = null;
    private previousLow: number | null = null;
    private previousClose: number | null = null;
    private readonly trueRange: RollingSum;
    private readonly positiveMovement: RollingSum;
    private readonly negativeMovement: RollingSum;

    constructor(readonly length: number) {
        super(['viPlus', 'viMinus']);
        if (!Number.isInteger(length) || length < 1 || length > 500)
            throw new RangeError('sschart: indicator length must be an integer from 1 to 500');
        this.trueRange = new RollingSum(length);
        this.positiveMovement = new RollingSum(length);
        this.negativeMovement = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const seeded = this.previousClose !== null && this.previousClose !== 0
            && this.previousHigh !== null && this.previousLow !== null;
        const trueRange = !seeded || high === null || low === null
            ? null
            : Math.max(
                high - low,
                Math.abs(high - this.previousClose!),
                Math.abs(low - this.previousClose!),
            );
        const positiveMovement = !seeded || high === null || low === null
            ? null
            : Math.abs(high - this.previousLow!);
        const negativeMovement = !seeded || high === null || low === null
            ? null
            : Math.abs(low - this.previousHigh!);
        const trueRangeSum = commit
            ? this.trueRange.push(trueRange)
            : this.trueRange.preview(trueRange);
        const positiveSum = commit
            ? this.positiveMovement.push(positiveMovement)
            : this.positiveMovement.preview(positiveMovement);
        const negativeSum = commit
            ? this.negativeMovement.push(negativeMovement)
            : this.negativeMovement.preview(negativeMovement);
        if (commit) {
            this.previousHigh = high;
            this.previousLow = low;
            this.previousClose = close;
        }

        const formed = trueRangeSum !== null && positiveSum !== null && negativeSum !== null;
        const viPlus = !formed ? null : trueRangeSum === 0 ? 0 : positiveSum / trueRangeSum;
        const viMinus = !formed ? null : trueRangeSum === 0 ? 0 : negativeSum / trueRangeSum;
        return {
            isFormed: formed,
            values: [
                this.output('viPlus', viPlus, input.index),
                this.output('viMinus', viMinus, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.previousHigh = null;
        this.previousLow = null;
        this.previousClose = null;
        this.trueRange.reset();
        this.positiveMovement.reset();
        this.negativeMovement.reset();
    }

    protected captureState(): VortexIndicatorCheckpoint {
        return Object.freeze({
            previousHigh: this.previousHigh,
            previousLow: this.previousLow,
            previousClose: this.previousClose,
            trueRange: this.trueRange.checkpoint(),
            positiveMovement: this.positiveMovement.checkpoint(),
            negativeMovement: this.negativeMovement.checkpoint(),
        });
    }

    protected restoreState(state: VortexIndicatorCheckpoint): void {
        const validNumber = (value: number | null) => value === null || finite(value) !== null;
        const validWindow = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !validNumber(state.previousHigh) || !validNumber(state.previousLow)
            || !validNumber(state.previousClose)
            || !validWindow(state.trueRange) || !validWindow(state.positiveMovement)
            || !validWindow(state.negativeMovement)
            || state.trueRange.values.length !== state.positiveMovement.values.length
            || state.trueRange.values.length !== state.negativeMovement.values.length) {
            throw new TypeError('sschart: invalid Vortex Indicator checkpoint');
        }
        this.trueRange.restore(state.trueRange);
        this.positiveMovement.restore(state.positiveMovement);
        this.negativeMovement.restore(state.negativeMovement);
        this.previousHigh = state.previousHigh;
        this.previousLow = state.previousLow;
        this.previousClose = state.previousClose;
    }
}

export const VortexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'VortexIndicator',
    name: 'Vortex Indicator',
    description: 'Positive and negative vortex movement divided by trailing true range.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [
        { id: 'viPlus', name: '+VI', defaultStyle: lineStyle('#26a69a') },
        { id: 'viMinus', name: '-VI', defaultStyle: lineStyle('#ef5350') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['vi', 'vortex', 'vortexindicator'],
    levels: [1],
    processorFactory: (parameters) => new VortexIndicatorProcessor(
        length(parameters?.length, 14),
    ),
});
