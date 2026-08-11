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

export class LinearRegressionSlopeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingLinearRegressionCheckpoint
> {
    private readonly regression: RollingLinearRegression;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Linear Reg Slope length must be an integer from 1 to 500',
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
            value = this.regression.slopeValue;
        } else {
            value = this.regression.previewSlope(close(input));
        }
        return {
            isFormed: this.regression.isFormed,
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

export const LinearRegressionSlopeIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'LinearRegSlope',
    name: 'Linear Reg Slope',
    description: 'Least-squares slope over a fixed trailing close-price window.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue: 11,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Slope',
        defaultStyle: { ...LENGTH_STYLE, color: '#ef5350' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['linregslope'],
    processorFactory: (parameters) => new LinearRegressionSlopeProcessor(
        resolvedLength(parameters, 11, 1),
    ),
});
