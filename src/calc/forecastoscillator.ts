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
    RollingLinearRegression,
    type RollingLinearRegressionCheckpoint,
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

export class ForecastOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingLinearRegressionCheckpoint
> {
    private readonly regression: RollingLinearRegression;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Forecast Oscillator length must be an integer from 1 to 500',
            );
        }
        this.regression = new RollingLinearRegression(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        const forecast = commit
            ? this.regression.push(price)
            : this.regression.preview(price);
        const candidate = this.length === 1 && price !== null
            ? 0
            : price !== null && price !== 0 && forecast !== null
                ? ((price - forecast) / price) * 100
                : null;
        const value = finite(candidate);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.regression.reset(); }
    protected captureState(): RollingLinearRegressionCheckpoint {
        return this.regression.checkpoint();
    }
    protected restoreState(state: RollingLinearRegressionCheckpoint): void {
        this.regression.restore(state);
    }
}

export const ForecastOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'ForecastOscillator',
    name: 'Forecast Oscillator',
    description: 'Percent distance between close and its rolling regression endpoint.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'Forecast Oscillator', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['forecastoscillator'],
    levels: [0],
    processorFactory: (parameters) => new ForecastOscillatorProcessor(
        resolvedLength(parameters, 14),
    ),
});
