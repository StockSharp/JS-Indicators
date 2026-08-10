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
    ExponentialMovingAverage,
    RollingStandardDeviation,
    type RollingWindowCheckpoint,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    parameter,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface AdaptivePriceZoneParameters extends IndicatorParameters {
    readonly period: number;
    readonly bandPercentage: number;
}

export interface AdaptivePriceZoneCheckpoint {
    readonly average: SeededMovingAverageCheckpoint;
    readonly deviation: RollingWindowCheckpoint;
}

export class AdaptivePriceZoneProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AdaptivePriceZoneCheckpoint
> {
    private readonly average: ExponentialMovingAverage;
    private readonly deviation: RollingStandardDeviation;

    constructor(readonly period: number, readonly bandPercentage: number) {
        super(['ma', 'upper', 'lower']);
        integer(period, period, 1, 500, 'period');
        parameter(bandPercentage, bandPercentage, 0, 500, 'bandPercentage');
        this.average = new ExponentialMovingAverage(period);
        this.deviation = new RollingStandardDeviation(period);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const ma = commit ? this.average.push(close) : this.average.preview(close);
        const deviation = commit ? this.deviation.push(close) : this.deviation.preview(close);
        const formed = ma !== null && deviation !== null;
        return {
            isFormed: formed,
            values: [
                this.output('ma', formed ? ma : null, input.index),
                this.output(
                    'upper',
                    formed ? ma + this.bandPercentage * deviation : null,
                    input.index,
                ),
                this.output(
                    'lower',
                    formed ? ma - this.bandPercentage * deviation : null,
                    input.index,
                ),
            ],
        };
    }

    protected resetState(): void {
        this.average.reset();
        this.deviation.reset();
    }

    protected captureState(): AdaptivePriceZoneCheckpoint {
        return Object.freeze({
            average: this.average.checkpoint(),
            deviation: this.deviation.checkpoint(),
        });
    }

    protected restoreState(state: AdaptivePriceZoneCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Adaptive Price Zone checkpoint');
        this.average.restore(state.average);
        this.deviation.restore(state.deviation);
    }
}

export const AdaptivePriceZoneIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptivePriceZoneParameters
> = registerIndicator({
    id: 'AdaptivePriceZone',
    name: 'Adaptive Price Zone',
    description: 'Exponential moving average surrounded by population-deviation price bands.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'period', name: 'Period', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'bandPercentage', name: 'Band Percentage',
            type: IndicatorParameterType.Number,
            defaultValue: 2, min: 0, max: 500, step: 0.1,
        },
    ],
    outputs: [
        {
            id: 'ma', name: 'Moving Average',
            defaultStyle: {
                series: IndicatorSeriesStyle.Line,
                color: '#ffca28',
                lineWidth: 2,
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'upper', name: 'Upper',
            defaultStyle: {
                series: IndicatorSeriesStyle.Band,
                color: '#42a5f5',
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'lower', name: 'Lower',
            defaultStyle: {
                series: IndicatorSeriesStyle.Band,
                color: '#42a5f5',
                options: { priceLineVisible: false },
            },
        },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['apz'],
    painter: 'band',
    processorFactory: (parameters) => new AdaptivePriceZoneProcessor(
        integer(parameters?.period, 5, 1, 500, 'period'),
        parameter(parameters?.bandPercentage, 2, 0, 500, 'bandPercentage'),
    ),
});
