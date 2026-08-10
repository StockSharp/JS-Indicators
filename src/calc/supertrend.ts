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
    ExpandingAverageTrueRange,
    type ExpandingAverageTrueRangeCheckpoint,
} from '../math/index.js';
import {
    parameter,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface SuperTrendParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiplier: number;
}

export interface SuperTrendCheckpoint {
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
    readonly previousSupertrend: number | null;
    readonly previousClose: number | null;
    readonly previousUpperBand: number | null;
    readonly previousLowerBand: number | null;
    readonly trend: -1 | 1;
}

/** StockSharp SuperTrend with direction carried as painter metadata. */
export class SuperTrendProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SuperTrendCheckpoint
> {
    private readonly averageTrueRange: ExpandingAverageTrueRange;
    private previousSupertrend: number | null = null;
    private previousClose: number | null = null;
    private previousUpperBand: number | null = null;
    private previousLowerBand: number | null = null;
    private trend: -1 | 1 = 1;

    constructor(readonly length: number, readonly multiplier: number) {
        super(['value']);
        integer(length, length, 1, 500, 'length');
        parameter(multiplier, multiplier, 0.000001, 500, 'multiplier');
        this.averageTrueRange = new ExpandingAverageTrueRange(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const candle = input.value;
        const averageTrueRange = commit
            ? this.averageTrueRange.push(candle)
            : this.averageTrueRange.preview(candle);
        const high = finite(candle?.high);
        const low = finite(candle?.low);
        const close = finite(candle?.close);

        // AverageTrueRange emits a growing warm-up value, while StockSharp's
        // SuperTrend deliberately waits until its configured window is formed.
        if (input.index < this.length - 1 || averageTrueRange === null
            || high === null || low === null || close === null) {
            return {
                isFormed: false,
                values: [this.output('value', null, input.index)],
            };
        }

        const midpoint = (high + low) / 2;
        const basicUpperBand = midpoint + this.multiplier * averageTrueRange;
        const basicLowerBand = midpoint - this.multiplier * averageTrueRange;
        const finalUpperBand = this.previousUpperBand === null
            || basicUpperBand < this.previousUpperBand
            || (this.previousClose !== null && this.previousClose > this.previousUpperBand)
            ? basicUpperBand
            : this.previousUpperBand;
        const finalLowerBand = this.previousLowerBand === null
            || basicLowerBand > this.previousLowerBand
            || (this.previousClose !== null && this.previousClose < this.previousLowerBand)
            ? basicLowerBand
            : this.previousLowerBand;

        let value: number;
        let trend: -1 | 1;
        if (this.previousSupertrend === null) {
            trend = close >= midpoint ? 1 : -1;
            value = trend === 1 ? finalLowerBand : finalUpperBand;
        } else if (this.trend === 1) {
            trend = close <= finalLowerBand ? -1 : 1;
            value = trend === 1 ? finalLowerBand : finalUpperBand;
        } else {
            trend = close >= finalUpperBand ? 1 : -1;
            value = trend === 1 ? finalLowerBand : finalUpperBand;
        }

        if (commit) {
            this.previousSupertrend = value;
            this.previousClose = close;
            this.previousUpperBand = finalUpperBand;
            this.previousLowerBand = finalLowerBand;
            this.trend = trend;
        }
        return {
            isFormed: true,
            values: [this.output('value', value, input.index, { up: trend === 1 })],
        };
    }

    protected resetState(): void {
        this.averageTrueRange.reset();
        this.previousSupertrend = null;
        this.previousClose = null;
        this.previousUpperBand = null;
        this.previousLowerBand = null;
        this.trend = 1;
    }

    protected captureState(): SuperTrendCheckpoint {
        return Object.freeze({
            averageTrueRange: this.averageTrueRange.checkpoint(),
            previousSupertrend: this.previousSupertrend,
            previousClose: this.previousClose,
            previousUpperBand: this.previousUpperBand,
            previousLowerBand: this.previousLowerBand,
            trend: this.trend,
        });
    }

    protected restoreState(state: SuperTrendCheckpoint): void {
        const recursive = [
            state?.previousSupertrend,
            state?.previousClose,
            state?.previousUpperBand,
            state?.previousLowerBand,
        ];
        const initialized = recursive[0] !== null;
        if (state === null || typeof state !== 'object'
            || ![-1, 1].includes(state.trend)
            || recursive.some((value) => value !== null && finite(value) === null)
            || recursive.some((value) => (value !== null) !== initialized)) {
            throw new TypeError('sschart: invalid SuperTrend checkpoint');
        }
        this.averageTrueRange.restore(state.averageTrueRange);
        this.previousSupertrend = state.previousSupertrend;
        this.previousClose = state.previousClose;
        this.previousUpperBand = state.previousUpperBand;
        this.previousLowerBand = state.previousLowerBand;
        this.trend = state.trend;
    }
}

export const SuperTrendIndicator: IndicatorDefinition<
    IndicatorCandle,
    SuperTrendParameters
> = registerIndicator({
    id: 'SuperTrend',
    name: 'Super Trend',
    description: 'ATR-based trailing trend line with the direction attached to each point.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'multiplier', name: 'Multiplier', type: IndicatorParameterType.Number,
            defaultValue: 3, min: 0.000001, max: 500, step: 0.1,
        },
    ],
    outputs: [{
        id: 'value', name: 'Super Trend',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#26a69a',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['supertrend'],
    processorFactory: (parameters) => new SuperTrendProcessor(
        integer(parameters?.length, 10, 1, 500, 'length'),
        parameter(parameters?.multiplier, 3, 0.000001, 500, 'multiplier'),
    ),
});
