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

export interface VolumeWeightedMovingAverageCheckpoint {
    readonly numerator: RollingWindowCheckpoint;
    readonly denominator: RollingWindowCheckpoint;
}

export class VolumeWeightedMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VolumeWeightedMovingAverageCheckpoint
> {
    private readonly numerator: RollingSum;
    private readonly denominator: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        this.numerator = new RollingSum(length);
        this.denominator = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        const valid = close !== null && volume !== null;
        const weighted = valid ? finite(close * volume) : null;
        const numerator = commit
            ? this.numerator.push(weighted)
            : this.numerator.preview(weighted);
        const denominator = commit
            ? this.denominator.push(valid ? volume : null)
            : this.denominator.preview(valid ? volume : null);
        const value = numerator !== null && denominator !== null && denominator !== 0
            ? numerator / denominator
            : null;
        return {
            isFormed: this.numerator.isFormed && this.denominator.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.numerator.reset();
        this.denominator.reset();
    }
    protected captureState(): VolumeWeightedMovingAverageCheckpoint {
        return Object.freeze({
            numerator: this.numerator.checkpoint(),
            denominator: this.denominator.checkpoint(),
        });
    }
    protected restoreState(state: VolumeWeightedMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.numerator?.values?.length !== state.denominator?.values?.length) {
            throw new TypeError('sschart: invalid VWMA checkpoint');
        }
        this.numerator.restore(state.numerator);
        this.denominator.restore(state.denominator);
    }
}

export const VolumeWeightedMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'VolumeWeightedMovingAverage',
    name: 'Volume Weighted Moving Average',
    description: 'Rolling closing-price average weighted by traded volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(32)],
    outputs: [{ id: 'line', name: 'VWMA', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['vwma', 'volumeweightedmovingaverage'],
    processorFactory: (parameters) => new VolumeWeightedMovingAverageProcessor(
        resolvedLength(parameters, 32),
    ),
});
