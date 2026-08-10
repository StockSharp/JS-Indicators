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
    PartialSeedSimpleMovingAverage,
    RollingMaximum,
    RollingMinimum,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
    number,
} from './shared/guards.js';

export interface ChandeKrollStopParameters extends IndicatorParameters {
    readonly period: number;
    readonly multiplier: number;
    readonly stopPeriod: number;
}

export interface ChandeKrollStopCheckpoint {
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
    readonly longAverage: RingBufferCheckpoint<number>;
    readonly shortAverage: RingBufferCheckpoint<number>;
}

export class ChandeKrollStopProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ChandeKrollStopCheckpoint
> {
    private readonly highest: RollingMaximum;
    private readonly lowest: RollingMinimum;
    private readonly longAverage: PartialSeedSimpleMovingAverage;
    private readonly shortAverage: PartialSeedSimpleMovingAverage;

    constructor(
        readonly period: number,
        readonly multiplier: number,
        readonly stopPeriod: number,
    ) {
        super(['longStop', 'shortStop']);
        length(period, period);
        number(multiplier, multiplier, 0.001, 30, 'multiplier');
        length(stopPeriod, stopPeriod);
        this.highest = new RollingMaximum(period);
        this.lowest = new RollingMinimum(period);
        this.longAverage = new PartialSeedSimpleMovingAverage(stopPeriod);
        this.shortAverage = new PartialSeedSimpleMovingAverage(stopPeriod);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const highest = commit ? this.highest.push(high) : this.highest.preview(high);
        const lowest = commit ? this.lowest.push(low) : this.lowest.preview(low);
        if (highest === null || lowest === null) {
            return {
                isFormed: false,
                values: [
                    this.output('longStop', null, input.index),
                    this.output('shortStop', null, input.index),
                ],
            };
        }

        const difference = highest - lowest;
        const rawLong = highest - difference * this.multiplier;
        const rawShort = lowest + difference * this.multiplier;
        const longStop = commit
            ? this.longAverage.push(rawLong)
            : this.longAverage.preview(rawLong);
        const shortStop = commit
            ? this.shortAverage.push(rawShort)
            : this.shortAverage.preview(rawShort);
        const formed = longStop !== null && shortStop !== null;
        return {
            isFormed: formed,
            values: [
                this.output('longStop', formed ? longStop : null, input.index),
                this.output('shortStop', formed ? shortStop : null, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.highest.reset();
        this.lowest.reset();
        this.longAverage.reset();
        this.shortAverage.reset();
    }

    protected captureState(): ChandeKrollStopCheckpoint {
        return Object.freeze({
            highest: this.highest.checkpoint(),
            lowest: this.lowest.checkpoint(),
            longAverage: this.longAverage.checkpoint(),
            shortAverage: this.shortAverage.checkpoint(),
        });
    }

    protected restoreState(state: ChandeKrollStopCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.highest?.values?.length !== state.lowest?.values?.length
            || state.longAverage?.values?.length !== state.shortAverage?.values?.length) {
            throw new TypeError('sschart: invalid Chande Kroll Stop checkpoint');
        }
        this.highest.restore(state.highest);
        this.lowest.restore(state.lowest);
        this.longAverage.restore(state.longAverage);
        this.shortAverage.restore(state.shortAverage);
    }
}

export const ChandeKrollStopIndicator: IndicatorDefinition<
    IndicatorCandle,
    ChandeKrollStopParameters
> = registerIndicator({
    id: 'ChandeKrollStop',
    name: 'Chande Kroll Stop',
    description: 'Range-adaptive long and short trailing-stop lines with partial-seed smoothing.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'period', name: 'Period', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'multiplier', name: 'Multiplier', type: IndicatorParameterType.Number,
            defaultValue: 1.5, min: 0.001, max: 30, step: 0.001,
        },
        {
            id: 'stopPeriod', name: 'Stop Period', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'longStop', name: 'Long Stop',
            defaultStyle: lineStyle('#26a69a'),
        },
        {
            id: 'shortStop', name: 'Short Stop',
            defaultStyle: lineStyle('#ef5350'),
        },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['chandekrollstop'],
    painter: 'dual-line',
    processorFactory: (parameters) => new ChandeKrollStopProcessor(
        length(parameters?.period, 10),
        number(parameters?.multiplier, 1.5, 0.001, 30, 'multiplier'),
        length(parameters?.stopPeriod, 9),
    ),
});
