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
    RingBuffer,
    type RingBufferCheckpoint,
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

export interface ChaikinMoneyFlowCheckpoint {
    readonly moneyFlowVolumes: RingBufferCheckpoint<number | null>;
    readonly moneyFlowVolumeSum: number;
    readonly volumeSum: number;
    readonly invalid: number;
}

/**
 * StockSharp-compatible CMF, including its historical denominator-eviction
 * behavior: an expired money-flow volume is subtracted from both sums.
 */
export class ChaikinMoneyFlowProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ChaikinMoneyFlowCheckpoint
> {
    private readonly moneyFlowVolumes: RingBuffer<number | null>;
    private moneyFlowVolumeSum = 0;
    private volumeSum = 0;
    private invalid = 0;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: CMF length must be a positive integer');
        this.moneyFlowVolumes = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        const valid = high !== null && low !== null && close !== null && volume !== null;
        const range = valid ? high - low : 0;
        const multiplier = valid && range !== 0
            ? ((close - low) - (high - close)) / range
            : 0;
        const candidate = valid ? multiplier * volume : Number.NaN;
        const moneyFlowVolume = Number.isFinite(candidate) ? candidate : null;
        const outgoing = this.moneyFlowVolumes.full
            ? (this.moneyFlowVolumes.front() ?? null)
            : undefined;

        let nextMoneyFlowVolumeSum = this.moneyFlowVolumeSum;
        let nextVolumeSum = this.volumeSum;
        let nextInvalid = this.invalid;
        if (moneyFlowVolume === null) nextInvalid += 1;
        else {
            nextMoneyFlowVolumeSum += moneyFlowVolume;
            nextVolumeSum += volume ?? 0;
        }
        if (outgoing !== undefined) {
            if (outgoing === null) nextInvalid -= 1;
            else {
                nextMoneyFlowVolumeSum -= outgoing;
                nextVolumeSum -= outgoing;
            }
        }

        if (commit) {
            this.moneyFlowVolumes.push(moneyFlowVolume);
            this.moneyFlowVolumeSum = nextMoneyFlowVolumeSum;
            this.volumeSum = nextVolumeSum;
            this.invalid = nextInvalid;
        }

        const nextSize = Math.min(this.length, this.moneyFlowVolumes.size + (commit ? 0 : 1));
        const formed = nextSize === this.length && nextInvalid === 0;
        const candidateValue = formed
            ? (nextVolumeSum !== 0 ? nextMoneyFlowVolumeSum / nextVolumeSum : 0)
            : null;
        const value = finite(candidateValue);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.moneyFlowVolumes.clear();
        this.moneyFlowVolumeSum = 0;
        this.volumeSum = 0;
        this.invalid = 0;
    }

    protected captureState(): ChaikinMoneyFlowCheckpoint {
        return Object.freeze({
            moneyFlowVolumes: this.moneyFlowVolumes.checkpoint(),
            moneyFlowVolumeSum: this.moneyFlowVolumeSum,
            volumeSum: this.volumeSum,
            invalid: this.invalid,
        });
    }

    protected restoreState(state: ChaikinMoneyFlowCheckpoint): void {
        const values = state?.moneyFlowVolumes?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => value !== null && finite(value) === null)
            || finite(state.moneyFlowVolumeSum) === null
            || finite(state.volumeSum) === null
            || !Number.isInteger(state.invalid) || state.invalid < 0
            || state.invalid !== values.filter((value) => value === null).length) {
            throw new TypeError('sschart: invalid CMF checkpoint');
        }
        this.moneyFlowVolumes.restore(state.moneyFlowVolumes);
        this.moneyFlowVolumeSum = state.moneyFlowVolumeSum;
        this.volumeSum = state.volumeSum;
        this.invalid = state.invalid;
    }
}

export const ChaikinMoneyFlowIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'ChaikinMoneyFlow',
    name: 'Chaikin Money Flow',
    description: 'Rolling volume-weighted close position within each candle range.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(20)],
    outputs: [{ id: 'line', name: 'CMF', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['cmf'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new ChaikinMoneyFlowProcessor(
        resolvedLength(parameters, 20),
    ),
});
