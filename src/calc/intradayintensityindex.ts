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

export class IntradayIntensityIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Intraday Intensity Index length must be an integer from 1 to 500',
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
        const volume = finite(input.value?.volume) ?? 0;
        let raw: number | null = null;
        if (high !== null && low !== null && close !== null) {
            const denominator = (high - low) * volume;
            raw = denominator === 0
                ? 0
                : finite(2 * ((close - low) - (high - close)) / denominator);
        }
        const value = commit ? this.average.push(raw) : this.average.preview(raw);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const IntradayIntensityIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'IntradayIntensityIndex',
    name: 'Intraday Intensity Index',
    description: 'Average close placement within the range normalized by volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'Intraday Intensity Index', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['iii'],
    levels: [0],
    processorFactory: (parameters) => new IntradayIntensityIndexProcessor(
        resolvedLength(parameters, 14),
    ),
});
