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

export interface MoneyFlowIndexCheckpoint {
    readonly previousTypical: number;
    readonly positive: RollingWindowCheckpoint;
    readonly negative: RollingWindowCheckpoint;
}

export class MoneyFlowIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MoneyFlowIndexCheckpoint
> {
    private previousTypical = 0;
    private readonly positive: RollingSum;
    private readonly negative: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        this.positive = new RollingSum(length);
        this.negative = new RollingSum(length);
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
        const typical = valid ? (high + low + close) / 3 : null;
        const flow = typical === null || volume === null ? 0 : typical * volume;
        const positive = typical !== null && typical > this.previousTypical ? flow : 0;
        const negative = typical !== null && typical < this.previousTypical ? flow : 0;
        const positiveSum = commit
            ? this.positive.push(positive)
            : this.positive.preview(positive);
        const negativeSum = commit
            ? this.negative.push(negative)
            : this.negative.preview(negative);
        if (commit && typical !== null) this.previousTypical = typical;

        let value: number | null = null;
        if (valid && positiveSum !== null && negativeSum !== null) {
            if (negativeSum === 0) value = 100;
            else {
                const total = positiveSum + negativeSum;
                value = total === 0 ? null : 100 * positiveSum / total;
            }
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousTypical = 0;
        this.positive.reset();
        this.negative.reset();
    }

    protected captureState(): MoneyFlowIndexCheckpoint {
        return Object.freeze({
            previousTypical: this.previousTypical,
            positive: this.positive.checkpoint(),
            negative: this.negative.checkpoint(),
        });
    }

    protected restoreState(state: MoneyFlowIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousTypical) === null
            || state.positive?.values?.length !== state.negative?.values?.length) {
            throw new TypeError('sschart: invalid MFI checkpoint');
        }
        this.positive.restore(state.positive);
        this.negative.restore(state.negative);
        this.previousTypical = state.previousTypical;
    }
}

export const MoneyFlowIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'MoneyFlowIndex',
    name: 'Money Flow Index',
    description: 'Volume-weighted momentum oscillator of positive and negative money flow.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'MFI', defaultStyle: lineStyle('#66bb6a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['mfi', 'moneyflowindex'],
    scaleRange: { min: 0, max: 100 },
    levels: [20, 80],
    processorFactory: (parameters) => new MoneyFlowIndexProcessor(
        resolvedLength(parameters, 14),
    ),
});
