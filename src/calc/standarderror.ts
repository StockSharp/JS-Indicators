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

export class StandardErrorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingLinearRegressionCheckpoint
> {
    private readonly regression: RollingLinearRegression;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Standard Error length must be an integer from 1 to 500',
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
            value = this.regression.standardErrorValue;
        } else {
            value = this.regression.previewStandardError(close(input));
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

export const StandardErrorIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'StandardError',
    name: 'Standard Error',
    description: 'Residual standard error of a least-squares close-price regression.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        description: 'Number of closing prices in the regression window.',
        type: IndicatorParameterType.Integer,
        defaultValue: 10,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Standard Error',
        defaultStyle: { ...LENGTH_STYLE, color: '#78909c' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['stderr', 'standarderror'],
    processorFactory: (parameters) => new StandardErrorProcessor(
        resolvedLength(parameters, 10, 1),
    ),
});
