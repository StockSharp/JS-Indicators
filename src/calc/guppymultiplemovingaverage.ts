import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
} from './shared/guards.js';

export interface GuppyMultipleMovingAverageCheckpoint {
    readonly short: readonly SeededMovingAverageCheckpoint[];
    readonly long: readonly SeededMovingAverageCheckpoint[];
}

export const GMMA_SHORT_LENGTHS = Object.freeze([3, 5, 8, 10, 12, 15] as const);

export const GMMA_LONG_LENGTHS = Object.freeze([30, 35, 40, 45, 50, 60] as const);

export const GMMA_OUTPUTS = Object.freeze([
    ...GMMA_SHORT_LENGTHS.map((length) => `short${length}`),
    ...GMMA_LONG_LENGTHS.map((length) => `long${length}`),
]);

export class GuppyMultipleMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    GuppyMultipleMovingAverageCheckpoint
> {
    private readonly short = GMMA_SHORT_LENGTHS.map(
        (length) => new ExponentialMovingAverage(length),
    );
    private readonly long = GMMA_LONG_LENGTHS.map(
        (length) => new ExponentialMovingAverage(length),
    );

    constructor() {
        super(GMMA_OUTPUTS);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const short = this.short.map((average) => (
            commit ? average.push(close) : average.preview(close)
        ));
        const long = this.long.map((average) => (
            commit ? average.push(close) : average.preview(close)
        ));
        const values = [
            ...short.map((value, index) => this.formedOutput(
                `short${GMMA_SHORT_LENGTHS[index]}`,
                value,
                this.short[index].isFormed,
                input.index,
            )),
            ...long.map((value, index) => this.formedOutput(
                `long${GMMA_LONG_LENGTHS[index]}`,
                value,
                this.long[index].isFormed,
                input.index,
            )),
        ];
        return {
            isFormed: this.long[this.long.length - 1].isFormed,
            values,
        };
    }

    protected resetState(): void {
        for (const average of this.short) average.reset();
        for (const average of this.long) average.reset();
    }

    protected captureState(): GuppyMultipleMovingAverageCheckpoint {
        return Object.freeze({
            short: Object.freeze(this.short.map((average) => average.checkpoint())),
            long: Object.freeze(this.long.map((average) => average.checkpoint())),
        });
    }

    protected restoreState(state: GuppyMultipleMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.short) || state.short.length !== this.short.length
            || !Array.isArray(state.long) || state.long.length !== this.long.length) {
            throw new TypeError('sschart: invalid Guppy Multiple Moving Average checkpoint');
        }
        state.short.forEach((checkpoint, index) => this.short[index].restore(checkpoint));
        state.long.forEach((checkpoint, index) => this.long[index].restore(checkpoint));
    }
}

export const GuppyMultipleMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'GuppyMultipleMovingAverage',
    name: 'Guppy Multiple Moving Average',
    description: 'Six short-term and six long-term exponential moving averages.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [
        ...GMMA_SHORT_LENGTHS.map((length, index) => ({
            id: `short${length}`,
            name: `Short EMA ${length}`,
            defaultStyle: style(
                IndicatorSeriesStyle.Line,
                ['#80deea', '#4dd0e1', '#26c6da', '#00acc1', '#0097a7', '#00838f'][index],
            ),
        })),
        ...GMMA_LONG_LENGTHS.map((length, index) => ({
            id: `long${length}`,
            name: `Long EMA ${length}`,
            defaultStyle: style(
                IndicatorSeriesStyle.Line,
                ['#ffcc80', '#ffb74d', '#ffa726', '#fb8c00', '#f57c00', '#ef6c00'][index],
            ),
        })),
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['gmma'],
    processorFactory: () => new GuppyMultipleMovingAverageProcessor(),
});
