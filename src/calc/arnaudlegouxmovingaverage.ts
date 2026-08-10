import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    FixedWeightedMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    LENGTH_STYLE,
    close,
    resolvedInteger,
    resolvedLength,
} from './shared/core.js';

export interface ArnaudLegouxMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly offset: number;
    readonly sigma: number;
}

export function resolvedNumber(
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    name: string,
): number {
    const resolved = value ?? fallback;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved)
        || resolved < minimum || resolved > maximum) {
        throw new RangeError(
            `sschart: indicator ${name} must be finite from ${minimum} to ${maximum}`,
        );
    }
    return resolved;
}

export function almaWeights(length: number, offset: number, sigma: number): readonly number[] {
    resolvedInteger(length, length, 1, 500, 'length');
    resolvedNumber(offset, 0.85, 0.000001, 0.999999, 'offset');
    resolvedInteger(sigma, sigma, 1, 500, 'sigma');
    const center = offset * (length - 1);
    const width = length / sigma;
    return Object.freeze(Array.from({ length }, (_, index) => {
        const distance = (index - center) / width;
        return Math.exp(-(distance * distance) / 2);
    }));
}

export class ArnaudLegouxMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingWindowCheckpoint
> {
    private readonly average: FixedWeightedMovingAverage;

    constructor(
        readonly length: number,
        readonly offset: number,
        readonly sigma: number,
    ) {
        super(['line']);
        this.average = new FixedWeightedMovingAverage(almaWeights(length, offset, sigma));
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.average.push(close(input))
            : this.average.preview(close(input));
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.average.reset(); }
    protected captureState(): RollingWindowCheckpoint { return this.average.checkpoint(); }
    protected restoreState(state: RollingWindowCheckpoint): void { this.average.restore(state); }
}

export const ArnaudLegouxMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    ArnaudLegouxMovingAverageParameters
> = registerIndicator({
    id: 'ArnaudLegouxMovingAverage',
    name: 'Arnaud Legoux Moving Average',
    description: 'StockSharp-oriented Gaussian weighted moving average of closing prices.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
        {
            id: 'offset', name: 'Offset', type: IndicatorParameterType.Number,
            defaultValue: 0.85, min: 0.000001, max: 0.999999, step: 0.001,
        },
        {
            id: 'sigma', name: 'Sigma', type: IndicatorParameterType.Integer,
            defaultValue: 6, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'ALMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#5c6bc0' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['alma'],
    processorFactory: (parameters) => new ArnaudLegouxMovingAverageProcessor(
        resolvedLength(parameters, 9, 1),
        resolvedNumber(parameters?.offset, 0.85, 0.000001, 0.999999, 'offset'),
        resolvedInteger(parameters?.sigma, 6, 1, 500, 'sigma'),
    ),
});
