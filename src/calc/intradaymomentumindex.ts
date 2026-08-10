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
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface IntradayMomentumIndexCheckpoint {
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}

export class IntradayMomentumIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    IntradayMomentumIndexCheckpoint
> {
    private readonly up: RollingSum;
    private readonly down: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Intraday Momentum Index length must be an integer from 1 to 500',
            );
        }
        this.up = new RollingSum(length);
        this.down = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const close = finite(input.value?.close);
        const difference = open === null || close === null ? null : finite(close - open);
        const up = difference === null ? null : Math.max(difference, 0);
        const down = difference === null ? null : Math.max(-difference, 0);
        const upSum = commit ? this.up.push(up) : this.up.preview(up);
        const downSum = commit ? this.down.push(down) : this.down.preview(down);
        let value: number | null = null;
        if (upSum !== null && downSum !== null) {
            const total = upSum + downSum;
            value = total === 0 ? 0 : finite(100 * upSum / total);
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.up.reset();
        this.down.reset();
    }

    protected captureState(): IntradayMomentumIndexCheckpoint {
        return Object.freeze({
            up: this.up.checkpoint(),
            down: this.down.checkpoint(),
        });
    }

    protected restoreState(state: IntradayMomentumIndexCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || !valid(state.up) || !valid(state.down)
            || state.up.values.length !== state.down.values.length) {
            throw new TypeError('sschart: invalid Intraday Momentum Index checkpoint');
        }
        this.up.restore(state.up);
        this.down.restore(state.down);
    }
}

export const IntradayMomentumIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'IntradayMomentumIndex',
    name: 'Intraday Momentum Index',
    description: 'RSI-style balance of intraday gains and losses measured from open to close.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'Intraday Momentum Index', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['imi'],
    scaleRange: { min: 0, max: 100 },
    levels: [30, 70],
    processorFactory: (parameters) => new IntradayMomentumIndexProcessor(
        resolvedLength(parameters, 14),
    ),
});
