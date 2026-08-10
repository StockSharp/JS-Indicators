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
    PartialSeedExponentialMovingAverage,
    type PartialSeedExponentialMovingAverageCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface T3MovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly volumeFactor: number;
}

export interface T3MovingAverageCheckpoint {
    readonly averages: readonly PartialSeedExponentialMovingAverageCheckpoint[];
    readonly warmUpPeriod: number;
}

export const T3_AVERAGE_COUNT = 6;

export const T3_WARM_UP_PERIOD = 10;

export class T3MovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    T3MovingAverageCheckpoint
> {
    private readonly averages: readonly PartialSeedExponentialMovingAverage[];
    private readonly coefficients: readonly [number, number, number, number];
    private warmUpPeriod = T3_WARM_UP_PERIOD;

    constructor(readonly length: number, readonly volumeFactor: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        if (typeof volumeFactor !== 'number' || !Number.isFinite(volumeFactor)
            || volumeFactor <= 0 || volumeFactor >= 1) {
            throw new RangeError('sschart: T3 volumeFactor must be finite between 0 and 1');
        }
        this.averages = Object.freeze(Array.from(
            { length: T3_AVERAGE_COUNT },
            () => new PartialSeedExponentialMovingAverage(length),
        ));
        const squared = volumeFactor * volumeFactor;
        const cubed = squared * volumeFactor;
        this.coefficients = Object.freeze([
            -cubed,
            3 * squared + 3 * cubed,
            -6 * squared - 3 * volumeFactor - 3 * cubed,
            1 + 3 * volumeFactor + cubed + 3 * squared,
        ]);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const values: Array<number | null> = [];
        let current = finite(input.value?.close);
        for (const average of this.averages) {
            current = commit ? average.push(current) : average.preview(current);
            values.push(current);
        }

        const allValuesFinite = values.every((value) => value !== null);
        const allFormed = allValuesFinite && this.averages.every((average) => (
            average.isFormed
            || (!commit && average.checkpoint().count + 1 >= average.windowLength)
        ));
        let effectiveWarmUp = this.warmUpPeriod;
        if (allFormed && effectiveWarmUp > 0) {
            effectiveWarmUp -= 1;
            if (commit) this.warmUpPeriod = effectiveWarmUp;
        }

        let value: number | null = null;
        if (allFormed && effectiveWarmUp === 0) {
            const [c1, c2, c3, c4] = this.coefficients;
            value = finite(
                c1 * values[5]!
                + c2 * values[4]!
                + c3 * values[3]!
                + c4 * values[2]!,
            );
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        for (const average of this.averages) average.reset();
        this.warmUpPeriod = T3_WARM_UP_PERIOD;
    }

    protected captureState(): T3MovingAverageCheckpoint {
        return Object.freeze({
            averages: Object.freeze(this.averages.map((average) => average.checkpoint())),
            warmUpPeriod: this.warmUpPeriod,
        });
    }

    protected restoreState(state: T3MovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.averages)
            || state.averages.length !== T3_AVERAGE_COUNT
            || !Number.isInteger(state.warmUpPeriod)
            || state.warmUpPeriod < 0 || state.warmUpPeriod > T3_WARM_UP_PERIOD
            || state.averages.some((checkpoint) => (
                checkpoint?.count !== state.averages[0]?.count
            ))) {
            throw new TypeError('sschart: invalid T3 Moving Average checkpoint');
        }
        state.averages.forEach((checkpoint, index) => {
            this.averages[index].restore(checkpoint);
        });
        this.warmUpPeriod = state.warmUpPeriod;
    }
}

export const T3MovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    T3MovingAverageParameters
> = registerIndicator({
    id: 'T3MovingAverage',
    name: 'T3 Moving Average',
    description: 'Tillson six-stage exponential moving average with configurable volume factor.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'volumeFactor', name: 'Volume Factor', type: IndicatorParameterType.Number,
            defaultValue: 0.7, min: 0.000001, max: 0.999999, step: 0.001,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'T3',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#26a69a', 2),
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['t3'],
    processorFactory: (parameters) => new T3MovingAverageProcessor(
        integer(parameters?.length, 5, 1, 500, 'length'),
        number(parameters?.volumeFactor, 0.7, 0.000001, 0.999999, 'volumeFactor'),
    ),
});
