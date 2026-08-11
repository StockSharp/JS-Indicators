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
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export class MomentumPinballProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RingBufferCheckpoint<number>
> {
    private readonly values: RingBuffer<number>;
    private readonly minimum: RollingMinimum;
    private readonly maximum: RollingMaximum;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.values = new RingBuffer(length);
        this.minimum = new RollingMinimum(length);
        this.maximum = new RollingMaximum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        if (price === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const minimum = commit ? this.minimum.push(price) : this.minimum.value;
        const maximum = commit ? this.maximum.push(price) : this.maximum.value;
        const formed = commit
            ? this.values.full || this.values.size + 1 === this.length
            : this.values.full;
        let oldest: number | null = null;
        if (formed) {
            oldest = commit
                ? this.values.full
                    ? (this.length === 1 ? price : (this.values.at(1) as number))
                    : (this.values.front() ?? price)
                : (this.values.front() ?? null);
        }
        if (commit) this.values.push(price);

        let value: number | null = null;
        if (minimum !== null && maximum !== null && oldest !== null) {
            const range = maximum - minimum;
            value = range === 0 ? 0 : finite((price - oldest) / range * 100);
        }
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.minimum.reset();
        this.maximum.reset();
    }

    protected captureState(): RingBufferCheckpoint<number> {
        return this.values.checkpoint();
    }

    protected restoreState(state: RingBufferCheckpoint<number>): void {
        const values = state?.values;
        if (!Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Momentum Pinball checkpoint');
        }
        this.resetState();
        for (const value of values) {
            this.values.push(value);
            this.minimum.push(value);
            this.maximum.push(value);
        }
    }
}

export const MomentumPinballIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'MomentumPinball',
    name: 'Momentum Pinball',
    description: 'Close displacement from the oldest price, normalized by the rolling range.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{
        id: 'line', name: 'Momentum Pinball',
        defaultStyle: lineStyle('#ff7043'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['momentumpinball'],
    scaleRange: { min: -100, max: 100 },
    levels: [0],
    processorFactory: (parameters) => new MomentumPinballProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
    ),
});
