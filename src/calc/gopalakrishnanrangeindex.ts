import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
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
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    period,
} from './shared/volatility.js';
import {
    finite,
} from './shared/guards.js';

export interface VolatilityLengthParameters extends IndicatorParameters {
    readonly length: number;
}

export interface GopalakrishnanRangeIndexCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export class GopalakrishnanRangeIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    GopalakrishnanRangeIndexCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;
    private readonly logLength: number | null;

    constructor(readonly length: number) {
        super(['line']);
        period(length, length, 'length');
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
        this.logLength = length > 1 ? Math.log(length) : null;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const currentHigh = finite(input.value?.high);
        const currentLow = finite(input.value?.low);
        const maximum = commit
            ? this.high.push(currentHigh)
            : this.high.preview(currentHigh);
        const minimum = commit
            ? this.low.push(currentLow)
            : this.low.preview(currentLow);

        let value: number | null = null;
        if (this.logLength !== null && maximum !== null && minimum !== null
            && currentHigh !== null && currentLow !== null) {
            const currentRange = currentHigh - currentLow;
            const candidate = currentRange > 0
                ? Math.log((maximum - minimum) / currentRange) / this.logLength
                : 0;
            value = finite(candidate);
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }

    protected captureState(): GopalakrishnanRangeIndexCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }

    protected restoreState(state: GopalakrishnanRangeIndexCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.high) || !valid(state.low)
            || state.high.values.length !== state.low.values.length) {
            throw new TypeError('sschart: invalid Gopalakrishnan Range Index checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const GopalakrishnanRangeIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    VolatilityLengthParameters
> = registerIndicator({
    id: 'GopalakrishnanRangeIndex',
    name: 'Gopalakrishnan Range Index',
    description: 'Log ratio of the rolling price range to the current candle range.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Gopalakrishnan Range Index',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#42a5f5',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['gri'],
    processorFactory: (parameters) => new GopalakrishnanRangeIndexProcessor(
        period(parameters?.length, 14, 'length'),
    ),
});
