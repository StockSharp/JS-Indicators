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
    PartialSeedSimpleMovingAverage,
    RingBuffer,
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
    type PartialRelativeStrengthIndexCheckpoint,
    type RingBufferCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface ConstanceBrownCompositeIndexParameters extends IndicatorParameters {
    readonly rsiLength: number;
    readonly rocLength: number;
    readonly shortRsiLength: number;
    readonly momentumLength: number;
    readonly fastSmaLength: number;
    readonly slowSmaLength: number;
}

export interface ConstanceBrownCompositeIndexCheckpoint {
    readonly rsi: PartialRelativeStrengthIndexCheckpoint;
    readonly shortRsi: PartialRelativeStrengthIndexCheckpoint;
    readonly rsiHistory: RingBufferCheckpoint<number | null>;
    readonly momentum: RingBufferCheckpoint<number>;
    readonly fastSma: RollingWindowCheckpoint;
    readonly slowSma: RollingWindowCheckpoint;
}

export class ConstanceBrownCompositeIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ConstanceBrownCompositeIndexCheckpoint
> {
    private readonly rsi: PartialRelativeStrengthIndex;
    private readonly shortRsi: PartialRelativeStrengthIndex;
    private readonly rsiHistory: RingBuffer<number | null>;
    private readonly momentum: PartialSeedSimpleMovingAverage;
    private readonly fastSma: SimpleMovingAverage;
    private readonly slowSma: SimpleMovingAverage;
    private readonly combinedBar: number;

    constructor(
        readonly rsiLength: number,
        readonly rocLength: number,
        readonly shortRsiLength: number,
        readonly momentumLength: number,
        readonly fastSmaLength: number,
        readonly slowSmaLength: number,
    ) {
        super(['composite', 'fastSma', 'slowSma']);
        for (const [value, name] of [
            [rsiLength, 'rsiLength'],
            [rocLength, 'rocLength'],
            [shortRsiLength, 'shortRsiLength'],
            [momentumLength, 'momentumLength'],
            [fastSmaLength, 'fastSmaLength'],
            [slowSmaLength, 'slowSmaLength'],
        ] as const) integer(value, value, 1, 500, name);
        this.rsi = new PartialRelativeStrengthIndex(rsiLength);
        this.shortRsi = new PartialRelativeStrengthIndex(shortRsiLength);
        this.rsiHistory = new RingBuffer(rocLength + 1);
        this.momentum = new PartialSeedSimpleMovingAverage(momentumLength);
        this.fastSma = new SimpleMovingAverage(fastSmaLength);
        this.slowSma = new SimpleMovingAverage(slowSmaLength);
        this.combinedBar = Math.max(
            rsiLength,
            shortRsiLength,
            rocLength + 1,
            momentumLength,
        );
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const rsi = commit ? this.rsi.push(close) : this.rsi.preview(close);
        const shortRsi = commit
            ? this.shortRsi.push(close)
            : this.shortRsi.preview(close);
        const roc = this.roc(rsi, commit);
        const momentum = commit
            ? this.momentum.push(shortRsi)
            : this.momentum.preview(shortRsi);
        // Past the combined gate the composite is published every bar, counting an inner that has
        // no value as 0 -- the platform's `?? 0`. Suppressing the bar instead makes the whole line
        // vanish on a market that only falls, where the RSI momentum never produces a value.
        const composite = input.index >= this.combinedBar
            ? finite((roc ?? 0) + (momentum ?? 0))
            : null;
        const fastSma = commit
            ? this.fastSma.push(composite)
            : this.fastSma.preview(composite);
        const slowSma = commit
            ? this.slowSma.push(composite)
            : this.slowSma.preview(composite);
        return {
            isFormed: composite !== null && fastSma !== null && slowSma !== null,
            values: [
                this.output('composite', composite, input.index),
                this.output('fastSma', fastSma, input.index),
                this.output('slowSma', slowSma, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.rsi.reset();
        this.shortRsi.reset();
        this.rsiHistory.clear();
        this.momentum.reset();
        this.fastSma.reset();
        this.slowSma.reset();
    }

    protected captureState(): ConstanceBrownCompositeIndexCheckpoint {
        return Object.freeze({
            rsi: this.rsi.checkpoint(),
            shortRsi: this.shortRsi.checkpoint(),
            rsiHistory: this.rsiHistory.checkpoint(),
            momentum: this.momentum.checkpoint(),
            fastSma: this.fastSma.checkpoint(),
            slowSma: this.slowSma.checkpoint(),
        });
    }

    protected restoreState(state: ConstanceBrownCompositeIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.rsiHistory?.values)
            || state.rsiHistory.values.length > this.rocLength + 1
            || state.rsiHistory.values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid Constance Brown Composite Index checkpoint');
        }
        this.rsi.restore(state.rsi);
        this.shortRsi.restore(state.shortRsi);
        this.rsiHistory.restore(state.rsiHistory);
        this.momentum.restore(state.momentum);
        this.fastSma.restore(state.fastSma);
        this.slowSma.restore(state.slowSma);
    }

    private roc(current: number | null, commit: boolean): number | null {
        let result: number | null = null;
        if (this.rsiHistory.size >= this.rocLength) {
            const previous = this.rsiHistory.at(this.rsiHistory.size - this.rocLength) ?? null;
            if (current !== null && previous !== null && previous !== 0)
                result = finite((current - previous) / previous * 100);
        }
        if (commit) this.rsiHistory.push(current);
        return result;
    }
}

export const ConstanceBrownCompositeIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    ConstanceBrownCompositeIndexParameters
> = registerIndicator({
    id: 'ConstanceBrownCompositeIndex',
    name: 'Constance Brown Composite Index',
    description: 'RSI rate of change plus short-RSI momentum with fast and slow signal averages.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'rsiLength', name: 'RSI Length', type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 500, step: 1,
        },
        {
            id: 'rocLength', name: 'ROC Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
        {
            id: 'shortRsiLength', name: 'Short RSI Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
        },
        {
            id: 'momentumLength', name: 'Momentum Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
        },
        {
            id: 'fastSmaLength', name: 'Fast SMA Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 13, min: 1, max: 500, step: 1,
        },
        {
            id: 'slowSmaLength', name: 'Slow SMA Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 33, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'composite', name: 'Composite',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
        },
        {
            id: 'fastSma', name: 'Fast SMA',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
        {
            id: 'slowSma', name: 'Slow SMA',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ef5350'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['cbci'],
    processorFactory: (parameters) => new ConstanceBrownCompositeIndexProcessor(
        integer(parameters?.rsiLength, 14, 1, 500, 'rsiLength'),
        integer(parameters?.rocLength, 9, 1, 500, 'rocLength'),
        integer(parameters?.shortRsiLength, 3, 1, 500, 'shortRsiLength'),
        integer(parameters?.momentumLength, 3, 1, 500, 'momentumLength'),
        integer(parameters?.fastSmaLength, 13, 1, 500, 'fastSmaLength'),
        integer(parameters?.slowSmaLength, 33, 1, 500, 'slowSmaLength'),
    ),
});
