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
    RingBuffer,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    period,
} from './shared/volatility.js';
import {
    finite,
} from './shared/guards.js';

export interface ChaikinVolatilityParameters extends IndicatorParameters {
    readonly emaLength: number;
    readonly rocLength: number;
}

export interface ChaikinVolatilityCheckpoint {
    readonly averageCount: number;
    readonly averageSeedSum: number;
    readonly averageFormed: boolean;
    readonly averagePrevious: number;
    readonly history: RingBufferCheckpoint<number | null>;
}

export interface AverageEvaluation {
    readonly count: number;
    readonly seedSum: number;
    readonly formed: boolean;
    readonly previous: number;
    readonly value: number | null;
}

export class ChaikinVolatilityProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ChaikinVolatilityCheckpoint
> {
    private averageCount = 0;
    private averageSeedSum = 0;
    private averageFormed = false;
    private averagePrevious = 0;
    private readonly history: RingBuffer<number | null>;

    constructor(readonly emaLength: number, readonly rocLength: number) {
        super(['line']);
        if (!Number.isInteger(emaLength) || emaLength < 1)
            throw new RangeError('sschart: Chaikin EMA length must be a positive integer');
        if (!Number.isInteger(rocLength) || rocLength < 1)
            throw new RangeError('sschart: Chaikin ROC length must be a positive integer');
        this.history = new RingBuffer(rocLength + 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const range = high === null || low === null ? null : finite(high - low);
        const evaluation = this.evaluateAverage(range);
        const average = evaluation.value;
        if (commit) {
            this.averageCount = evaluation.count;
            this.averageSeedSum = evaluation.seedSum;
            this.averageFormed = evaluation.formed;
            this.averagePrevious = evaluation.previous;
        }
        if (commit && evaluation.formed && average !== null) this.history.push(average);
        const formed = this.history.size > this.rocLength;
        const past = formed ? this.history.front() : undefined;
        const candidate = average !== null && typeof past === 'number' && past !== 0
            ? (average - past) / past * 100
            : null;
        const value = finite(candidate);
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.averageCount = 0;
        this.averageSeedSum = 0;
        this.averageFormed = false;
        this.averagePrevious = 0;
        this.history.clear();
    }

    protected captureState(): ChaikinVolatilityCheckpoint {
        return Object.freeze({
            averageCount: this.averageCount,
            averageSeedSum: this.averageSeedSum,
            averageFormed: this.averageFormed,
            averagePrevious: this.averagePrevious,
            history: this.history.checkpoint(),
        });
    }

    protected restoreState(state: ChaikinVolatilityCheckpoint): void {
        const values = state?.history?.values;
        if (state === null || typeof state !== 'object'
            || !Array.isArray(values) || values.length > this.rocLength + 1
            || values.some((value) => value !== null && finite(value) === null)
            || !Number.isInteger(state.averageCount)
            || state.averageCount < 0 || state.averageCount > this.emaLength
            || finite(state.averageSeedSum) === null
            || typeof state.averageFormed !== 'boolean'
            || finite(state.averagePrevious) === null
            || state.averageFormed !== (state.averageCount === this.emaLength)) {
            throw new TypeError('sschart: invalid Chaikin Volatility checkpoint');
        }
        this.averageCount = state.averageCount;
        this.averageSeedSum = state.averageSeedSum;
        this.averageFormed = state.averageFormed;
        this.averagePrevious = state.averagePrevious;
        this.history.restore(state.history);
    }

    private evaluateAverage(value: number | null): AverageEvaluation {
        if (value === null) {
            return {
                count: this.averageCount,
                seedSum: this.averageSeedSum,
                formed: this.averageFormed,
                previous: this.averagePrevious,
                value: null,
            };
        }
        if (!this.averageFormed) {
            const count = this.averageCount + 1;
            const seedSum = this.averageSeedSum + value;
            const formed = count === this.emaLength;
            const previous = formed ? seedSum / this.emaLength : this.averagePrevious;
            return { count, seedSum, formed, previous, value: formed ? previous : null };
        }
        const multiplier = 2 / (this.emaLength + 1);
        const previous = value * multiplier + this.averagePrevious * (1 - multiplier);
        return {
            count: this.averageCount,
            seedSum: this.averageSeedSum,
            formed: true,
            previous,
            value: previous,
        };
    }
}

export const ChaikinVolatilityIndicator: IndicatorDefinition<
    IndicatorCandle,
    ChaikinVolatilityParameters
> = registerIndicator({
    id: 'ChaikinVolatility',
    name: 'Chaikin Volatility',
    description: 'Rate of change of an exponential average of candle ranges.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'emaLength', name: 'EMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 32, min: 1, max: 500, step: 1,
        },
        {
            id: 'rocLength', name: 'ROC Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'Chaikin Volatility',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ab47bc',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['chaikinvolatility'],
    levels: [0],
    processorFactory: (parameters) => new ChaikinVolatilityProcessor(
        period(parameters?.emaLength, 32, 'emaLength'),
        period(parameters?.rocLength, 5, 'rocLength'),
    ),
});
