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
    PartialRelativeStrengthIndex,
    RingBuffer,
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
    type PartialRelativeStrengthIndexCheckpoint,
    type RingBufferCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface CompositeMomentumParameters extends IndicatorParameters {
    readonly shortRocLength: number;
    readonly longRocLength: number;
    readonly rsiLength: number;
    readonly emaFastLength: number;
    readonly emaSlowLength: number;
    readonly smaLength: number;
}

export interface CompositeMomentumCheckpoint {
    readonly shortRoc: RingBufferCheckpoint<number | null>;
    readonly longRoc: RingBufferCheckpoint<number | null>;
    readonly rsi: PartialRelativeStrengthIndexCheckpoint;
    readonly fast: FiniteExponentialCheckpoint;
    readonly slow: FiniteExponentialCheckpoint;
    readonly average: RollingWindowCheckpoint;
}

export class CompositeMomentumProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    CompositeMomentumCheckpoint
> {
    private readonly shortRoc: RingBuffer<number | null>;
    private readonly longRoc: RingBuffer<number | null>;
    private readonly rsi: PartialRelativeStrengthIndex;
    private readonly fast: FiniteExponentialAverage;
    private readonly slow: FiniteExponentialAverage;
    private readonly average: SimpleMovingAverage;

    constructor(
        readonly shortRocLength: number,
        readonly longRocLength: number,
        readonly rsiLength: number,
        readonly emaFastLength: number,
        readonly emaSlowLength: number,
        readonly smaLength: number,
    ) {
        super(['composite', 'sma']);
        for (const [value, name] of [
            [shortRocLength, 'shortRocLength'],
            [longRocLength, 'longRocLength'],
            [rsiLength, 'rsiLength'],
            [emaFastLength, 'emaFastLength'],
            [emaSlowLength, 'emaSlowLength'],
            [smaLength, 'smaLength'],
        ] as const) integer(value, value, 1, 500, name);
        this.shortRoc = new RingBuffer(shortRocLength + 1);
        this.longRoc = new RingBuffer(longRocLength + 1);
        this.rsi = new PartialRelativeStrengthIndex(rsiLength);
        this.fast = new FiniteExponentialAverage(emaFastLength);
        this.slow = new FiniteExponentialAverage(emaSlowLength);
        this.average = new SimpleMovingAverage(smaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const shortRoc = this.rateOfChange(
            this.shortRoc,
            this.shortRocLength,
            close,
            commit,
        );
        const longRoc = this.rateOfChange(
            this.longRoc,
            this.longRocLength,
            close,
            commit,
        );
        const partialRsi = commit ? this.rsi.push(close) : this.rsi.preview(close);
        const rsi = input.index >= this.rsiLength ? partialRsi : null;
        const fast = commit ? this.fast.push(close) : this.fast.preview(close);
        const slow = commit ? this.slow.push(close) : this.slow.preview(close);

        const inputsFormed = this.shortRoc.size > this.shortRocLength
            && this.longRoc.size > this.longRocLength
            && this.rsi.isFormed && this.fast.isFormed && this.slow.isFormed;
        let composite: number | null = null;
        if (inputsFormed && shortRoc !== null && longRoc !== null && rsi !== null
            && fast !== null && slow !== null) {
            const normalizedShort = shortRoc / 100;
            const normalizedLong = longRoc / 100;
            const normalizedRsi = (rsi - 50) / 50;
            const macd = slow === 0 ? 0 : (fast - slow) / slow;
            composite = finite(
                (normalizedShort + normalizedLong + normalizedRsi + macd) / 4 * 100,
            );
        }

        const sma = composite === null
            ? null
            : (commit ? this.average.push(composite) : this.average.preview(composite));
        return {
            isFormed: composite !== null && sma !== null,
            values: [
                this.formedOutput('composite', composite, composite !== null, input.index),
                this.formedOutput('sma', sma, this.average.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.shortRoc.clear();
        this.longRoc.clear();
        this.rsi.reset();
        this.fast.reset();
        this.slow.reset();
        this.average.reset();
    }

    protected captureState(): CompositeMomentumCheckpoint {
        return Object.freeze({
            shortRoc: this.shortRoc.checkpoint(),
            longRoc: this.longRoc.checkpoint(),
            rsi: this.rsi.checkpoint(),
            fast: this.fast.checkpoint(),
            slow: this.slow.checkpoint(),
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: CompositeMomentumCheckpoint): void {
        const histories = [
            [state?.shortRoc, this.shortRocLength + 1],
            [state?.longRoc, this.longRocLength + 1],
        ] as const;
        if (state === null || typeof state !== 'object'
            || histories.some(([history, capacity]) => (
                !Array.isArray(history?.values) || history.values.length > capacity
                || history.values.some((value) => value !== null && finite(value) === null)
            ))) {
            throw new TypeError('sschart: invalid Composite Momentum checkpoint');
        }
        this.shortRoc.restore(state.shortRoc);
        this.longRoc.restore(state.longRoc);
        this.rsi.restore(state.rsi);
        this.fast.restore(state.fast);
        this.slow.restore(state.slow);
        this.average.restore(state.average);
    }

    private rateOfChange(
        history: RingBuffer<number | null>,
        length: number,
        current: number | null,
        commit: boolean,
    ): number | null {
        let result: number | null = null;
        if (history.size >= length) {
            const previous = history.at(history.size - length) ?? null;
            if (current !== null && previous !== null && previous !== 0)
                result = finite((current - previous) / previous * 100);
        }
        if (commit) history.push(current);
        return result;
    }
}

export const CompositeMomentumIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompositeMomentumParameters
> = registerIndicator({
    id: 'CompositeMomentum',
    name: 'Composite Momentum',
    description: 'Normalized short and long ROC, RSI and EMA spread with an SMA signal.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortRocLength', name: 'Short ROC Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 500, step: 1,
        },
        {
            id: 'longRocLength', name: 'Long ROC Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 28, min: 1, max: 500, step: 1,
        },
        {
            id: 'rsiLength', name: 'RSI Length', type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 500, step: 1,
        },
        {
            id: 'emaFastLength', name: 'Fast EMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 500, step: 1,
        },
        {
            id: 'emaSlowLength', name: 'Slow EMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 500, step: 1,
        },
        {
            id: 'smaLength', name: 'SMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'composite', name: 'Composite',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
        },
        {
            id: 'sma', name: 'SMA',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['compositemomentum'],
    processorFactory: (parameters) => new CompositeMomentumProcessor(
        integer(parameters?.shortRocLength, 14, 1, 500, 'shortRocLength'),
        integer(parameters?.longRocLength, 28, 1, 500, 'longRocLength'),
        integer(parameters?.rsiLength, 14, 1, 500, 'rsiLength'),
        integer(parameters?.emaFastLength, 12, 1, 500, 'emaFastLength'),
        integer(parameters?.emaSlowLength, 26, 1, 500, 'emaSlowLength'),
        integer(parameters?.smaLength, 9, 1, 500, 'smaLength'),
    ),
});
