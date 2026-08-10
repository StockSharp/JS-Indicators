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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface RangeActionVerificationIndexParameters extends IndicatorParameters {
    readonly shortSmaLength: number;
    readonly longSmaLength: number;
}

export interface RangeActionVerificationIndexCheckpoint {
    readonly shortAverage: RollingWindowCheckpoint;
    readonly longAverage: RollingWindowCheckpoint;
}

export class RangeActionVerificationIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RangeActionVerificationIndexCheckpoint
> {
    private readonly shortAverage: SimpleMovingAverage;
    private readonly longAverage: SimpleMovingAverage;

    constructor(readonly shortSmaLength: number, readonly longSmaLength: number) {
        super(['line']);
        resolvedPeriod(shortSmaLength, shortSmaLength, 'shortSmaLength');
        resolvedPeriod(longSmaLength, longSmaLength, 'longSmaLength', 650);
        this.shortAverage = new SimpleMovingAverage(shortSmaLength);
        this.longAverage = new SimpleMovingAverage(longSmaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit
            ? this.shortAverage.push(close)
            : this.shortAverage.preview(close);
        const long = commit
            ? this.longAverage.push(close)
            : this.longAverage.preview(close);
        const value = short === null || long === null || long === 0
            ? null
            : finite(Math.abs(100 * (short - long) / long));
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.shortAverage.reset();
        this.longAverage.reset();
    }

    protected captureState(): RangeActionVerificationIndexCheckpoint {
        return Object.freeze({
            shortAverage: this.shortAverage.checkpoint(),
            longAverage: this.longAverage.checkpoint(),
        });
    }

    protected restoreState(state: RangeActionVerificationIndexCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint, maximum: number) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= maximum
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.shortAverage, this.shortSmaLength)
            || !valid(state.longAverage, this.longSmaLength)) {
            throw new TypeError('sschart: invalid Range Action Verification Index checkpoint');
        }
        this.shortAverage.restore(state.shortAverage);
        this.longAverage.restore(state.longAverage);
    }
}

export const RangeActionVerificationIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeActionVerificationIndexParameters
> = registerIndicator({
    id: 'RangeActionVerificationIndex',
    name: 'Range Action Verification Index',
    description: 'Absolute percentage divergence between short and long simple averages.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortSmaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 7, min: 1, max: 500, step: 1,
        },
        {
            id: 'longSmaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 65, min: 1, max: 650, step: 1,
        },
    ],
    outputs: [{ id: 'line', name: 'RAVI', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['ravi', 'rangeactionverificationindex'],
    processorFactory: (parameters) => new RangeActionVerificationIndexProcessor(
        resolvedPeriod(parameters?.shortSmaLength, 7, 'shortSmaLength'),
        resolvedPeriod(parameters?.longSmaLength, 65, 'longSmaLength', 650),
    ),
});
