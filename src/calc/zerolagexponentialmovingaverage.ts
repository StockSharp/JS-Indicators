import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
import {
    LENGTH_STYLE,
    LengthIndicatorParameters,
    close,
    resolvedInteger,
    resolvedLength,
} from './shared/core.js';

export interface ZeroLagExponentialMovingAverageCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
    readonly previous: number;
}

export class ZeroLagExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ZeroLagExponentialMovingAverageCheckpoint
> {
    private readonly prices: RingBuffer<number | null>;
    private readonly lag: number;
    private readonly multiplier: number;
    private previous = 0;

    constructor(readonly length: number) {
        super(['line']);
        resolvedInteger(length, length, 1, 500, 'length');
        this.prices = new RingBuffer(length);
        this.lag = Math.floor((length - 1) / 2);
        this.multiplier = 2 / (length + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const current = close(input);
        const window = this.prices.toArray();
        if (window.length === this.length) window.shift();
        window.push(current);
        if (commit) this.prices.push(current);
        if (window.length < this.length) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const lagged = window[this.lag];
        if (current === null || lagged === null) {
            return {
                isFormed: true,
                values: [this.output('line', null, input.index)],
            };
        }
        const value = this.multiplier * (2 * current - lagged)
            + (1 - this.multiplier) * this.previous;
        if (commit) this.previous = value;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.prices.clear();
        this.previous = 0;
    }

    protected captureState(): ZeroLagExponentialMovingAverageCheckpoint {
        return Object.freeze({
            prices: this.prices.checkpoint(),
            previous: this.previous,
        });
    }

    protected restoreState(state: ZeroLagExponentialMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.prices?.values)
            || state.prices.values.length > this.length
            || state.prices.values.some((value) => (
                value !== null && (typeof value !== 'number' || !Number.isFinite(value))
            ))
            || typeof state.previous !== 'number' || !Number.isFinite(state.previous)) {
            throw new TypeError('sschart: invalid ZLEMA checkpoint');
        }
        this.prices.restore(state.prices);
        this.previous = state.previous;
    }
}

export const ZeroLagExponentialMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    LengthIndicatorParameters
> = registerIndicator({
    id: 'ZeroLagExponentialMovingAverage',
    name: 'Zero Lag Exponential Moving Average',
    description: 'Lag-compensated exponential average using StockSharp oldest-first indexing.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length',
        name: 'Length',
        type: IndicatorParameterType.Integer,
        defaultValue: 14,
        min: 1,
        max: 500,
        step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'ZLEMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#26c6da' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['zlema', 'zerolagexponentialmovingaverage'],
    processorFactory: (parameters) => new ZeroLagExponentialMovingAverageProcessor(
        resolvedLength(parameters, 14, 1),
    ),
});
