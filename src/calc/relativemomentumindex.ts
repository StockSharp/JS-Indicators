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
    RingBuffer,
    SimpleMovingAverage,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface RelativeMomentumIndexParameters extends IndicatorParameters {
    readonly length: number;
    readonly momentumPeriod: number;
}

export interface RelativeMomentumIndexCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}

export class RelativeMomentumIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RelativeMomentumIndexCheckpoint
> {
    private readonly prices: RingBuffer<number | null>;
    private readonly up: SimpleMovingAverage;
    private readonly down: SimpleMovingAverage;

    constructor(readonly length: number, readonly momentumPeriod: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        resolvedPeriod(momentumPeriod, momentumPeriod, 'momentumPeriod');
        this.prices = new RingBuffer(momentumPeriod + 1);
        this.up = new SimpleMovingAverage(length);
        this.down = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const past = this.prices.size < this.momentumPeriod
            ? null
            : (this.prices.at(this.prices.size - this.momentumPeriod) ?? null);
        const momentum = close === null || past === null ? null : close - past;
        const averageUp = commit
            ? this.up.push(momentum === null ? null : Math.max(momentum, 0))
            : this.up.preview(momentum === null ? null : Math.max(momentum, 0));
        const averageDown = commit
            ? this.down.push(momentum === null ? null : Math.max(-momentum, 0))
            : this.down.preview(momentum === null ? null : Math.max(-momentum, 0));
        if (commit) this.prices.push(close);

        const denominator = averageUp === null || averageDown === null
            ? 0
            : averageUp + averageDown;
        const value = averageUp === null || averageDown === null || denominator === 0
            ? null
            : 100 * averageUp / denominator;
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.prices.clear();
        this.up.reset();
        this.down.reset();
    }

    protected captureState(): RelativeMomentumIndexCheckpoint {
        return Object.freeze({
            prices: this.prices.checkpoint(),
            up: this.up.checkpoint(),
            down: this.down.checkpoint(),
        });
    }

    protected restoreState(state: RelativeMomentumIndexCheckpoint): void {
        const valid = (checkpoint: RingBufferCheckpoint<number | null>, maximum: number) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= maximum
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.prices, this.momentumPeriod + 1)
            || !valid(state.up, this.length) || !valid(state.down, this.length)) {
            throw new TypeError('sschart: invalid Relative Momentum Index checkpoint');
        }
        this.prices.restore(state.prices);
        this.up.restore(state.up);
        this.down.restore(state.down);
    }
}

export const RelativeMomentumIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RelativeMomentumIndexParameters
> = registerIndicator({
    id: 'RelativeMomentumIndex',
    name: 'Relative Momentum Index',
    description: 'RSI-style balance of gains and losses measured over a configurable price lag.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        lengthParameter(14),
        {
            id: 'momentumPeriod', name: 'Momentum Period',
            type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{ id: 'line', name: 'RMI', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['rmi', 'relativemomentumindex'],
    scaleRange: { min: 0, max: 100 },
    levels: [30, 70],
    processorFactory: (parameters) => new RelativeMomentumIndexProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
        resolvedPeriod(parameters?.momentumPeriod, 3, 'momentumPeriod'),
    ),
});
