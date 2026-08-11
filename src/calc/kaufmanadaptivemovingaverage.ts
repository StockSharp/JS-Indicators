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
    RollingEfficiencyRatio,
    type RollingEfficiencyRatioCheckpoint,
} from '../math/index.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface KaufmanAdaptiveParameters extends IndicatorParameters {
    readonly length: number;
    readonly fastSCPeriod: number;
    readonly slowSCPeriod: number;
}

export interface KaufmanAdaptiveCheckpoint {
    readonly disabled: boolean;
    readonly seeded: boolean;
    readonly previous: number;
    readonly ratio: RollingEfficiencyRatioCheckpoint;
}

function previewEfficiency(
    committed: readonly (number | null)[],
    length: number,
    close: number | null,
): number | null {
    if (close === null || committed.length !== length + 1
        || committed.some((value) => typeof value !== 'number')) return null;

    // KAMA builds a replace-oldest candidate buffer for a non-final value.
    // KaufmanEfficiencyRatio itself uses an extended committed path instead,
    // so these two platform indicators deliberately cannot share preview().
    const values = [...committed.slice(1), close] as number[];
    let volatility = 0;
    for (let index = 1; index < values.length; index += 1)
        volatility += Math.abs(values[index]! - values[index - 1]!);
    if (volatility === 0) volatility = 0.00001;
    return Math.abs(close - values[0]!) / volatility;
}

export class KaufmanAdaptiveMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KaufmanAdaptiveCheckpoint
> {
    private readonly ratio: RollingEfficiencyRatio;
    private readonly fastConstant: number;
    private readonly slowConstant: number;
    private disabled = false;
    private seeded = false;
    private previous = 0;

    constructor(
        readonly length: number,
        readonly fastSCPeriod: number,
        readonly slowSCPeriod: number,
    ) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        integer(fastSCPeriod, fastSCPeriod, 1, 500, 'fastSCPeriod');
        integer(slowSCPeriod, slowSCPeriod, 1, 500, 'slowSCPeriod');
        this.ratio = new RollingEfficiencyRatio(length + 1);
        this.fastConstant = 2 / (fastSCPeriod + 1);
        this.slowConstant = 2 / (slowSCPeriod + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        if (this.disabled) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        const close = finite(input.value?.close);
        const efficiency = commit
            ? this.ratio.push(close)
            : previewEfficiency(this.ratio.checkpoint().values, this.length, close);
        if (input.index < this.length) {
            if (commit && close === null) this.disabled = true;
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        if (!this.seeded) {
            if (close === null || efficiency === null) {
                if (commit) this.disabled = true;
                return {
                    isFormed: false,
                    values: [this.output('line', null, input.index)],
                };
            }
            if (commit) {
                this.seeded = true;
                this.previous = close;
            }
            return {
                isFormed: true,
                values: [this.output('line', close, input.index)],
            };
        }
        if (close === null || efficiency === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        const scaled = efficiency * (this.fastConstant - this.slowConstant)
            + this.slowConstant;
        const value = (close - this.previous) * scaled * scaled + this.previous;
        if (commit) this.previous = value;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.ratio.reset();
        this.disabled = false;
        this.seeded = false;
        this.previous = 0;
    }

    protected captureState(): KaufmanAdaptiveCheckpoint {
        return Object.freeze({
            disabled: this.disabled,
            seeded: this.seeded,
            previous: this.previous,
            ratio: this.ratio.checkpoint(),
        });
    }

    protected restoreState(state: KaufmanAdaptiveCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.disabled !== 'boolean' || typeof state.seeded !== 'boolean'
            || finite(state.previous) === null || (state.disabled && state.seeded)) {
            throw new TypeError('sschart: invalid KAMA checkpoint');
        }
        this.ratio.restore(state.ratio);
        this.disabled = state.disabled;
        this.seeded = state.seeded;
        this.previous = state.previous;
    }

}

export const KaufmanAdaptiveMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    KaufmanAdaptiveParameters
> = registerIndicator({
    id: 'KaufmanAdaptiveMovingAverage',
    name: 'Kaufman Adaptive Moving Average',
    description: 'Efficiency-ratio adaptive moving average with fast and slow limits.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 1, min: 1, max: 500, step: 1,
        },
        {
            id: 'fastSCPeriod', name: 'Fast SC', type: IndicatorParameterType.Integer,
            defaultValue: 2, min: 1, max: 500, step: 1,
        },
        {
            id: 'slowSCPeriod', name: 'Slow SC', type: IndicatorParameterType.Integer,
            defaultValue: 30, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'KAMA',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#26c6da',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['kama'],
    processorFactory: (parameters) => new KaufmanAdaptiveMovingAverageProcessor(
        integer(parameters?.length, 10, 1, 500, 'length'),
        integer(parameters?.fastSCPeriod, 2, 1, 500, 'fastSCPeriod'),
        integer(parameters?.slowSCPeriod, 30, 1, 500, 'slowSCPeriod'),
    ),
});
