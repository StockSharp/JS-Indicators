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
    RollingStandardDeviation,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    period,
} from './shared/volatility.js';
import {
    finite,
} from './shared/guards.js';

export interface HistoricalVolatilityRatioParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}

export interface HistoricalVolatilityRatioCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
}

export class HistoricalVolatilityRatioProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    HistoricalVolatilityRatioCheckpoint
> {
    private readonly short: RollingStandardDeviation;
    private readonly long: RollingStandardDeviation;

    constructor(readonly shortPeriod: number, readonly longPeriod: number) {
        super(['line']);
        period(shortPeriod, shortPeriod, 'shortPeriod');
        period(longPeriod, longPeriod, 'longPeriod');
        this.short = new RollingStandardDeviation(shortPeriod);
        this.long = new RollingStandardDeviation(longPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = commit ? this.short.push(close) : this.short.preview(close);
        const long = commit ? this.long.push(close) : this.long.preview(close);
        const value = short === null || long === null
            ? null
            : (long === 0 ? 0 : finite(short / long));
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
    }

    protected captureState(): HistoricalVolatilityRatioCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
        });
    }

    protected restoreState(state: HistoricalVolatilityRatioCheckpoint): void {
        if (state === null || typeof state !== 'object') {
            throw new TypeError('sschart: invalid Historical Volatility Ratio checkpoint');
        }
        this.short.restore(state.short);
        this.long.restore(state.long);
    }
}

export const HistoricalVolatilityRatioIndicator: IndicatorDefinition<
    IndicatorCandle,
    HistoricalVolatilityRatioParameters
> = registerIndicator({
    id: 'HistoricalVolatilityRatio',
    name: 'Historical Volatility Ratio',
    description: 'Ratio of short and long population deviations of closing price.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 20, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'Historical Volatility Ratio',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ab47bc',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['hvr'],
    levels: [1],
    processorFactory: (parameters) => new HistoricalVolatilityRatioProcessor(
        period(parameters?.shortPeriod, 5, 'shortPeriod'),
        period(parameters?.longPeriod, 20, 'longPeriod'),
    ),
});
