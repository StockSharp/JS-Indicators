import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
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
    AdaptiveLengthParameters,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface McGinleyDynamicCheckpoint {
    readonly count: number;
    readonly seedSum: number;
    readonly seedValid: boolean;
    readonly previous: number | null;
}

export class McGinleyDynamicProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    McGinleyDynamicCheckpoint
> {
    private count = 0;
    private seedSum = 0;
    private seedValid = true;
    private previous: number | null = null;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        let value: number | null = null;

        if (this.count < this.length) {
            const count = this.count + 1;
            const seedSum = this.seedSum + (price ?? 0);
            const seedValid = this.seedValid && price !== null;
            if (count === this.length && seedValid) value = seedSum / this.length;
            if (commit) {
                this.count = count;
                this.seedSum = seedSum;
                this.seedValid = seedValid;
                if (value !== null) this.previous = value;
            }
        } else if (price !== null && this.previous !== null && this.previous !== 0) {
            const ratio = price / this.previous;
            const denominator = 0.6 * this.length * Math.pow(ratio, 4);
            if (Number.isFinite(denominator) && denominator !== 0) {
                value = finite(this.previous + (price - this.previous) / denominator);
                if (commit && value !== null) this.previous = value;
            }
        }

        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.count = 0;
        this.seedSum = 0;
        this.seedValid = true;
        this.previous = null;
    }

    protected captureState(): McGinleyDynamicCheckpoint {
        return Object.freeze({
            count: this.count,
            seedSum: this.seedSum,
            seedValid: this.seedValid,
            previous: this.previous,
        });
    }

    protected restoreState(state: McGinleyDynamicCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Number.isInteger(state.count) || state.count < 0 || state.count > this.length
            || finite(state.seedSum) === null || typeof state.seedValid !== 'boolean'
            || (state.previous !== null && finite(state.previous) === null)
            || (state.count < this.length && state.previous !== null)
            || (state.count === this.length && state.seedValid !== (state.previous !== null))) {
            throw new TypeError('sschart: invalid McGinley Dynamic checkpoint');
        }
        this.count = state.count;
        this.seedSum = state.seedSum;
        this.seedValid = state.seedValid;
        this.previous = state.previous;
    }
}

export const McGinleyDynamicIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptiveLengthParameters
> = registerIndicator({
    id: 'McGinleyDynamic',
    name: 'McGinley Dynamic',
    description: 'Price-speed-adjusted recursive moving average seeded by a full-window mean.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'McGinley Dynamic',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#42a5f5',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['mcginley', 'mcginleydynamic'],
    processorFactory: (parameters) => new McGinleyDynamicProcessor(
        integer(parameters?.length, 14, 1, 500, 'length'),
    ),
});
