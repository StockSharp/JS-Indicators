import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
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
    isPlatformZero,
    LinearWeightedMovingAverage,
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    CycleLengthParameters,
} from './shared/cycle.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface CenterOfGravityCheckpoint {
    readonly sum: RollingWindowCheckpoint;
    readonly weighted: RollingWindowCheckpoint;
}

export class CenterOfGravityOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    CenterOfGravityCheckpoint
> {
    private readonly sum: RollingSum;
    private readonly weighted: LinearWeightedMovingAverage;
    private readonly divisor: number;
    private readonly center: number;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: COG length must be a positive integer');
        this.sum = new RollingSum(length);
        this.weighted = new LinearWeightedMovingAverage(length);
        this.divisor = length * (length + 1) / 2;
        this.center = (length + 1) / 2;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const sum = commit ? this.sum.push(close) : this.sum.preview(close);
        const weightedAverage = commit
            ? this.weighted.push(close)
            : this.weighted.preview(close);
        // The window's prices can cancel exactly in decimal while leaving a residual here.
        const candidate = sum !== null && weightedAverage !== null
            && !isPlatformZero(sum, (close ?? 0) * this.length)
            ? weightedAverage * this.divisor / sum - this.center
            : null;
        const value = finite(candidate);
        return {
            isFormed: this.sum.isFormed && this.weighted.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.sum.reset();
        this.weighted.reset();
    }

    protected captureState(): CenterOfGravityCheckpoint {
        return Object.freeze({
            sum: this.sum.checkpoint(),
            weighted: this.weighted.checkpoint(),
        });
    }

    protected restoreState(state: CenterOfGravityCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.sum?.values?.length !== state.weighted?.values?.length) {
            throw new TypeError('sschart: invalid Center Of Gravity checkpoint');
        }
        this.sum.restore(state.sum);
        this.weighted.restore(state.weighted);
    }
}

export const CenterOfGravityOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    CycleLengthParameters
> = registerIndicator({
    id: 'CenterOfGravityOscillator',
    name: 'Center Of Gravity Oscillator',
    description: 'Price center of gravity over a linearly weighted rolling window.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 10, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Center Of Gravity',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#42a5f5',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['cog', 'cgo'],
    levels: [0],
    processorFactory: (parameters) => new CenterOfGravityOscillatorProcessor(
        length(parameters?.length, 10),
    ),
});
