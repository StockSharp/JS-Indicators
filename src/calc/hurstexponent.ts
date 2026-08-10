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

export interface HurstExponentCheckpoint {
    readonly values: RingBufferCheckpoint<number | null>;
}

export interface HurstWindowEvaluation {
    readonly size: number;
    readonly sum: number;
    readonly invalid: number;
}

export class HurstExponentProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    HurstExponentCheckpoint
> {
    private readonly values: RingBuffer<number | null>;
    private readonly logLength: number | null;
    private sum = 0;
    private invalid = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedLength({ length }, length, 1, 1_000);
        this.values = new RingBuffer<number | null>(length);
        this.logLength = length > 1 ? Math.log(length) : null;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const evaluation = this.evaluate(close);
        let value: number | null = null;
        if (evaluation.size === this.length && evaluation.invalid === 0
            && this.logLength !== null) {
            const mean = evaluation.sum / this.length;
            let cumulative = 0;
            let maximum = -Infinity;
            let minimum = Infinity;
            let squared = 0;
            for (let index = 0; index < this.length; index += 1) {
                const item = this.projectedValue(index, close)!;
                const deviation = item - mean;
                cumulative += deviation;
                maximum = Math.max(maximum, cumulative);
                minimum = Math.min(minimum, cumulative);
                squared += deviation * deviation;
            }
            const deviation = Math.sqrt(squared / this.length);
            if (deviation !== 0) {
                const rescaledRange = (maximum - minimum) / deviation;
                value = finite(Math.log(rescaledRange) / this.logLength);
            }
        }
        if (commit) {
            this.values.push(close);
            this.sum = evaluation.sum;
            this.invalid = evaluation.invalid;
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.sum = 0;
        this.invalid = 0;
    }

    protected captureState(): HurstExponentCheckpoint {
        return Object.freeze({ values: this.values.checkpoint() });
    }

    protected restoreState(state: HurstExponentCheckpoint): void {
        const values = state?.values?.values;
        if (!Array.isArray(values) || values.length > this.length
            || values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid Hurst Exponent checkpoint');
        }
        this.resetState();
        for (const value of values) this.append(value);
    }

    private evaluate(incoming: number | null): HurstWindowEvaluation {
        const outgoing = this.values.full ? (this.values.front() ?? null) : null;
        return {
            size: Math.min(this.length, this.values.size + 1),
            sum: this.sum
                - (this.values.full ? (outgoing ?? 0) : 0)
                + (incoming ?? 0),
            invalid: this.invalid
                - (this.values.full && outgoing === null ? 1 : 0)
                + (incoming === null ? 1 : 0),
        };
    }

    private projectedValue(index: number, incoming: number | null): number | null | undefined {
        if (this.values.full) {
            return index === this.length - 1 ? incoming : this.values.at(index + 1);
        }
        return index === this.values.size ? incoming : this.values.at(index);
    }

    private append(value: number | null): void {
        const evaluation = this.evaluate(value);
        this.values.push(value);
        this.sum = evaluation.sum;
        this.invalid = evaluation.invalid;
    }
}

export const HurstExponentIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'HurstExponent',
    name: 'Hurst Exponent',
    description: 'Rescaled-range estimate over a fixed rolling close-price window.',
    category: IndicatorCategory.Statistical,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(100, 1, 1_000)],
    outputs: [{ id: 'line', name: 'Hurst Exponent', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['hurst', 'hurstexponent'],
    scaleRange: { min: 0, max: 1 },
    levels: [0.5],
    processorFactory: (parameters) => new HurstExponentProcessor(
        resolvedLength(parameters, 100, 1, 1_000),
    ),
});
