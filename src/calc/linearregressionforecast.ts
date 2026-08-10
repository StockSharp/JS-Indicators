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
    RollingLinearRegression,
    type RollingLinearRegressionCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedLength,
} from './shared/core.js';

export class LinearRegressionForecastProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingLinearRegressionCheckpoint
> {
    private readonly regression: RollingLinearRegression;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Linear Regression Forecast length must be an integer from 1 to 500',
            );
        }
        this.regression = new RollingLinearRegression(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        let value: number | null;
        if (commit) {
            this.regression.push(close(input));
            value = this.regression.nextValue;
        } else {
            value = this.regression.previewNext(close(input));
        }
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

export const LinearRegressionForecastIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'LinearRegressionForecast',
    name: 'Linear Regression Forecast',
    description: 'One-bar-ahead least-squares forecast from a fixed trailing close window.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue: 14,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Forecast',
        defaultStyle: { ...LENGTH_STYLE, color: '#5c6bc0' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['linregforecast'],
    processorFactory: (parameters) => new LinearRegressionForecastProcessor(
        resolvedLength(parameters, 14, 1),
    ),
});
