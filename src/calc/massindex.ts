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
    PartialSeedExponentialMovingAverage,
    RingBuffer,
    type RingBufferCheckpoint,
    type PartialSeedExponentialMovingAverageCheckpoint,
} from '../math/index.js';
import {
    period,
} from './shared/volatility.js';
import {
    finite,
} from './shared/guards.js';

export interface MassIndexParameters extends IndicatorParameters {
    readonly length: number;
    readonly emaLength: number;
}

export interface MassIndexCheckpoint {
    readonly single: PartialSeedExponentialMovingAverageCheckpoint;
    readonly double: PartialSeedExponentialMovingAverageCheckpoint;
    readonly ratios: RingBufferCheckpoint<number>;
    readonly ratioSum: number;
}

export class MassIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MassIndexCheckpoint
> {
    private readonly single: PartialSeedExponentialMovingAverage;
    private readonly double: PartialSeedExponentialMovingAverage;
    private readonly ratios: RingBuffer<number>;
    private ratioSum = 0;

    constructor(readonly length: number, readonly emaLength: number) {
        super(['line']);
        period(length, length, 'length');
        period(emaLength, emaLength, 'emaLength');
        this.single = new PartialSeedExponentialMovingAverage(emaLength);
        this.double = new PartialSeedExponentialMovingAverage(emaLength);
        this.ratios = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const range = high === null || low === null ? null : finite(high - low);
        let ratio: number | null = null;

        if (range === null) {
            if (commit) {
                this.single.reset();
                this.double.reset();
            }
        } else if (commit) {
            const single = this.single.push(range);
            const double = this.double.push(single);
            if (this.single.isFormed && this.double.isFormed
                && single !== null && double !== null && double !== 0) {
                ratio = finite(single / double);
            }
        } else {
            const singleState = this.single.checkpoint();
            const doubleState = this.double.checkpoint();
            const single = this.single.preview(range);
            const double = this.double.preview(single);
            const singleFormed = this.single.isFormed
                || singleState.count + 1 === this.emaLength;
            const doubleFormed = this.double.isFormed
                || doubleState.count + 1 === this.emaLength;
            if (singleFormed && doubleFormed
                && single !== null && double !== null && double !== 0) {
                ratio = finite(single / double);
            }
        }

        let value = this.ratios.full ? this.ratioSum : null;
        if (ratio !== null) {
            const outgoing = this.ratios.full ? (this.ratios.front() as number) : 0;
            const nextSum = this.ratioSum - outgoing + ratio;
            const nextSize = Math.min(this.length, this.ratios.size + 1);
            value = nextSize === this.length ? nextSum : null;
            if (commit) {
                this.ratios.push(ratio);
                this.ratioSum = nextSum;
            }
        }

        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.single.reset();
        this.double.reset();
        this.ratios.clear();
        this.ratioSum = 0;
    }

    protected captureState(): MassIndexCheckpoint {
        return Object.freeze({
            single: this.single.checkpoint(),
            double: this.double.checkpoint(),
            ratios: this.ratios.checkpoint(),
            ratioSum: this.ratioSum,
        });
    }

    protected restoreState(state: MassIndexCheckpoint): void {
        const ratios = state?.ratios?.values;
        const rebuiltSum = Array.isArray(ratios)
            ? ratios.reduce((sum, value) => sum + value, 0)
            : 0;
        const tolerance = Math.max(1, Math.abs(rebuiltSum)) * Number.EPSILON * 128;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(ratios) || ratios.length > this.length
            || ratios.some((value) => finite(value) === null)
            || finite(state.ratioSum) === null
            || Math.abs(state.ratioSum - rebuiltSum) > tolerance) {
            throw new TypeError('sschart: invalid Mass Index checkpoint');
        }
        this.single.restore(state.single);
        this.double.restore(state.double);
        this.ratios.restore(state.ratios);
        this.ratioSum = state.ratioSum;
    }
}

export const MassIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MassIndexParameters
> = registerIndicator({
    id: 'MassIndex',
    name: 'Mass Index',
    description: 'Rolling sum of the ratio between single- and double-smoothed candle ranges.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 25, min: 1, max: 500, step: 1,
        },
        {
            id: 'emaLength', name: 'EMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'Mass Index',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ab47bc',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['massindex'],
    levels: [26.5, 27],
    processorFactory: (parameters) => new MassIndexProcessor(
        period(parameters?.length, 25, 'length'),
        period(parameters?.emaLength, 9, 'emaLength'),
    ),
});
