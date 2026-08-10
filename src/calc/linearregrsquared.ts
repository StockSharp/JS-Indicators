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

export class LinearRegressionRSquaredProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingLinearRegressionCheckpoint
> {
    private readonly regression: RollingLinearRegression;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Linear Reg R Squared length must be an integer from 1 to 500',
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
            value = this.regression.rSquaredValue;
        } else {
            value = this.regression.previewRSquared(close(input));
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

export const LinearRegressionRSquaredIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'LinearRegRSquared',
    name: 'Linear Reg R Squared',
    description: 'Coefficient of determination for a trailing close-price regression.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue: 10,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'R Squared',
        defaultStyle: { ...LENGTH_STYLE, color: '#7e57c2' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['rsquared', 'linregrsquared'],
    scaleRange: { min: 0, max: 1 },
    processorFactory: (parameters) => new LinearRegressionRSquaredProcessor(
        resolvedLength(parameters, 10, 1),
    ),
});
