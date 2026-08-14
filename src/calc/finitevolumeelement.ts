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
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export class FiniteVolumeElementProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Finite Volume Element length must be an integer from 1 to 500',
            );
        }
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        const range = high === null || low === null ? null : high - low;
        let raw = 0;
        if (range !== null && range !== 0 && close !== null
            && volume !== null && volume !== 0) {
            const volumeForce = volume * (2 * ((close - low!) / range) - 1);
            raw = volumeForce / volume;
        }
        // The platform previews as `Buffer.Sum + (fve - Buffer.Back())`: a forming bar replaces the
        // newest committed sample instead of rolling the window, and only over a full window.
        const average = commit
            ? this.average.push(raw)
            : this.average.previewReplacingLatest(raw);
        const value = average === null ? null : finite(average * 100);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const FiniteVolumeElementIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'FiniteVolumeElement',
    name: 'Finite Volume Element',
    description: 'Average close position within the candle range, gated by volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(22)],
    outputs: [{ id: 'line', name: 'Finite Volume Element', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['fve'],
    levels: [0],
    processorFactory: (parameters) => new FiniteVolumeElementProcessor(
        resolvedLength(parameters, 22),
    ),
});
