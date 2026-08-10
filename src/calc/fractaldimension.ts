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
    RingBuffer,
    RollingMaximum,
    RollingMinimum,
    type RingBufferCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    RecursiveLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/recursive-statistical.js';
import {
    finite,
} from './shared/guards.js';

export interface FractalDimensionCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
}

export class FractalDimensionProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    FractalDimensionCheckpoint
> {
    private readonly values: RingBuffer<number>;
    private readonly maximum: RollingMaximum;
    private readonly minimum: RollingMinimum;
    private readonly logDenominator: number | null;
    private pathLength = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedLength({ length }, length, 1, 500);
        this.values = new RingBuffer<number>(length);
        this.maximum = new RollingMaximum(length);
        this.minimum = new RollingMinimum(length);
        this.logDenominator = length > 1 ? Math.log(2 * (length - 1)) : null;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const pathLength = this.projectPath(close);
        const maximum = commit ? this.maximum.push(close) : this.maximum.preview(close);
        const minimum = commit ? this.minimum.push(close) : this.minimum.preview(close);
        if (commit) {
            this.values.push(close);
            this.pathLength = pathLength;
        }

        let value: number | null = null;
        if (maximum !== null && minimum !== null) {
            const range = maximum - minimum;
            let dimension = pathLength === 0 || range === 0 || this.logDenominator === null
                ? 1.5
                : 1 + (Math.log(pathLength) - Math.log(range)) / this.logDenominator;
            dimension = Math.max(1, Math.min(2, dimension));
            value = finite(dimension);
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.maximum.reset();
        this.minimum.reset();
        this.pathLength = 0;
    }

    protected captureState(): FractalDimensionCheckpoint {
        return Object.freeze({ values: this.values.checkpoint() });
    }

    protected restoreState(state: FractalDimensionCheckpoint): void {
        const values = state?.values?.values;
        if (!Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Fractal Dimension checkpoint');
        }
        this.resetState();
        for (const value of values) this.append(value);
    }

    private projectPath(value: number): number {
        if (this.values.size === 0 || this.length === 1) return 0;
        let path = this.pathLength + Math.abs(value - this.values.back()!);
        if (this.values.full) {
            path -= Math.abs(this.values.at(1)! - this.values.front()!);
        }
        return Math.max(0, path);
    }

    private append(value: number): void {
        this.pathLength = this.projectPath(value);
        this.maximum.push(value);
        this.minimum.push(value);
        this.values.push(value);
    }
}

export const FractalDimensionIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'FractalDimension',
    name: 'Fractal Dimension',
    description: 'Clamped fractal dimension of the rolling close-price path.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(30, 1, 500)],
    outputs: [{ id: 'line', name: 'Fractal Dimension', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['fractaldimension'],
    scaleRange: { min: 1, max: 2 },
    levels: [1.5],
    processorFactory: (parameters) => new FractalDimensionProcessor(
        resolvedLength(parameters, 30, 1, 500),
    ),
});
