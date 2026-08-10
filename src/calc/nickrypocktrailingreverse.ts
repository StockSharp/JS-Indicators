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
    parameter,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface NickRypockTrailingReverseParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiple: number;
}

export interface NickRypockTrailingReverseCheckpoint {
    readonly initialized: boolean;
    readonly k: number;
    readonly reverse: number;
    readonly highPrice: number;
    readonly lowPrice: number;
    readonly trend: -1 | 0 | 1;
    readonly validCount: number;
}

export class NickRypockTrailingReverseProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    NickRypockTrailingReverseCheckpoint
> {
    private initialized = false;
    private k = 0;
    private reverse = 0;
    private highPrice = 0;
    private lowPrice = 0;
    private trend: -1 | 0 | 1 = 0;
    private validCount = 0;
    private readonly multiplier: number;

    constructor(readonly length: number, readonly multiple: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        if (typeof multiple !== 'number' || !Number.isFinite(multiple))
            throw new RangeError('sschart: indicator multiple must be finite');
        this.multiplier = Math.max(1, multiple) / 1_000;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        if (price === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        let initialized = this.initialized;
        let k = this.k;
        let reverse = this.reverse;
        let highPrice = this.highPrice;
        let lowPrice = this.lowPrice;
        let trend = this.trend;
        let newTrend: -1 | 0 | 1 = 0;
        if (!initialized) {
            initialized = true;
            k = price;
            highPrice = price;
            lowPrice = price;
        }

        k = (k + (price - k) / this.length) * this.multiplier;
        if (trend >= 0) {
            if (price > highPrice) highPrice = price;
            reverse = highPrice - k;
            if (price <= reverse) {
                newTrend = -1;
                lowPrice = price;
                reverse = lowPrice + k;
            } else {
                newTrend = 1;
            }
        }
        if (trend <= 0) {
            if (price < lowPrice) lowPrice = price;
            reverse = lowPrice + k;
            if (price >= reverse) {
                newTrend = 1;
                highPrice = price;
                reverse = highPrice - k;
            } else {
                newTrend = -1;
            }
        }
        if (newTrend !== 0) trend = newTrend;

        const validCount = this.validCount + 1;
        const value = validCount >= this.length ? finite(reverse) : null;
        if (commit) {
            this.initialized = initialized;
            this.k = k;
            this.reverse = reverse;
            this.highPrice = highPrice;
            this.lowPrice = lowPrice;
            this.trend = trend;
            this.validCount = validCount;
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.k = 0;
        this.reverse = 0;
        this.highPrice = 0;
        this.lowPrice = 0;
        this.trend = 0;
        this.validCount = 0;
    }

    protected captureState(): NickRypockTrailingReverseCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            k: this.k,
            reverse: this.reverse,
            highPrice: this.highPrice,
            lowPrice: this.lowPrice,
            trend: this.trend,
            validCount: this.validCount,
        });
    }

    protected restoreState(state: NickRypockTrailingReverseCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || finite(state.k) === null || finite(state.reverse) === null
            || finite(state.highPrice) === null || finite(state.lowPrice) === null
            || ![-1, 0, 1].includes(state.trend)
            || !Number.isInteger(state.validCount) || state.validCount < 0
            || state.initialized !== (state.validCount > 0)
            || (!state.initialized && (
                state.k !== 0 || state.reverse !== 0 || state.highPrice !== 0
                || state.lowPrice !== 0 || state.trend !== 0
            ))) {
            throw new TypeError('sschart: invalid Nick Rypock Trailing Reverse checkpoint');
        }
        this.initialized = state.initialized;
        this.k = state.k;
        this.reverse = state.reverse;
        this.highPrice = state.highPrice;
        this.lowPrice = state.lowPrice;
        this.trend = state.trend;
        this.validCount = state.validCount;
    }
}

export const NickRypockTrailingReverseIndicator: IndicatorDefinition<
    IndicatorCandle,
    NickRypockTrailingReverseParameters
> = registerIndicator({
    id: 'NickRypockTrailingReverse',
    name: 'Nick Rypock Trailing Reverse',
    description: 'Adaptive trailing reversal line driven by trend extremes and a smoothed step.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 50, min: 1, max: 500, step: 1,
        },
        {
            id: 'multiple', name: 'Multiple (per mille)',
            type: IndicatorParameterType.Number,
            defaultValue: 100, min: 0, max: 1_000, step: 1,
        },
    ],
    outputs: [{
        id: 'line', name: 'NRTR',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ef5350',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['nrtr'],
    processorFactory: (parameters) => new NickRypockTrailingReverseProcessor(
        integer(parameters?.length, 50, 1, 500, 'length'),
        parameter(parameters?.multiple, 100, 0, 1_000, 'multiple'),
    ),
});
