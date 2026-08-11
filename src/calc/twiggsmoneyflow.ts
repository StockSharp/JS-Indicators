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
    ExponentialMovingAverage,
    type SeededMovingAverageCheckpoint,
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

export interface TwiggsMoneyFlowCheckpoint {
    readonly advanceDecline: SeededMovingAverageCheckpoint;
    readonly volume: SeededMovingAverageCheckpoint;
    readonly previousAdvanceDecline: number;
}

export class TwiggsMoneyFlowProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TwiggsMoneyFlowCheckpoint
> {
    private readonly advanceDecline: ExponentialMovingAverage;
    private readonly volume: ExponentialMovingAverage;
    private previousAdvanceDecline = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.advanceDecline = new ExponentialMovingAverage(length);
        this.volume = new ExponentialMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const incomingVolume = finite(input.value?.volume);
        if (high === null || low === null || close === null || incomingVolume === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const range = high - low;
        const typical = (high + low + close) / 3;
        const advanceDecline = range === 0
            ? this.previousAdvanceDecline
            : finite(incomingVolume * (2 * typical - high - low) / range);
        if (advanceDecline === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const averageAdvanceDecline = commit
            ? this.advanceDecline.push(advanceDecline)
            : this.advanceDecline.preview(advanceDecline);
        const averageVolume = commit
            ? this.volume.push(incomingVolume)
            : this.volume.preview(incomingVolume);
        if (commit) this.previousAdvanceDecline = advanceDecline;

        const formed = this.advanceDecline.isFormed && this.volume.isFormed;
        const ratio = !formed
            || averageAdvanceDecline === null
            || averageVolume === null
            || averageVolume === 0
            ? null
            : finite(averageAdvanceDecline / averageVolume);
        const value = ratio === 0 ? null : ratio;
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.advanceDecline.reset();
        this.volume.reset();
        this.previousAdvanceDecline = 0;
    }

    protected captureState(): TwiggsMoneyFlowCheckpoint {
        return Object.freeze({
            advanceDecline: this.advanceDecline.checkpoint(),
            volume: this.volume.checkpoint(),
            previousAdvanceDecline: this.previousAdvanceDecline,
        });
    }

    protected restoreState(state: TwiggsMoneyFlowCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousAdvanceDecline) === null
            || state.advanceDecline?.count !== state.volume?.count
            || state.advanceDecline?.formed !== state.volume?.formed) {
            throw new TypeError('sschart: invalid Twiggs Money Flow checkpoint');
        }
        this.advanceDecline.restore(state.advanceDecline);
        this.volume.restore(state.volume);
        this.previousAdvanceDecline = state.previousAdvanceDecline;
    }
}

export const TwiggsMoneyFlowIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'TwiggsMoneyFlow',
    name: 'Twiggs Money Flow',
    description: 'Ratio of exponential averages of Twiggs accumulation and traded volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(21)],
    outputs: [{ id: 'line', name: 'TMF', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['tmf', 'twiggsmoneyflow'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new TwiggsMoneyFlowProcessor(
        resolvedLength(parameters, 21),
    ),
});
