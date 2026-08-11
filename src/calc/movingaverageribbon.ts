import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorOutputDefinition,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    RIBBON_COLORS,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface MovingAverageRibbonParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly ribbonCount: number;
}

export interface MovingAverageRibbonCheckpoint {
    readonly averages: readonly RollingWindowCheckpoint[];
}

export function movingAverageRibbonLengths(
    shortPeriod: number,
    longPeriod: number,
    ribbonCount: number,
): readonly number[] {
    integer(shortPeriod, shortPeriod, 1, 500, 'shortPeriod');
    integer(longPeriod, longPeriod, 1, 1_000, 'longPeriod');
    integer(ribbonCount, ribbonCount, 2, 500, 'ribbonCount');
    const step = Math.trunc((longPeriod - shortPeriod) / (ribbonCount - 1));
    return Object.freeze(Array.from(
        { length: ribbonCount },
        (_, index) => shortPeriod + index * step,
    ));
}

export function movingAverageRibbonOutputs(
    parameters: MovingAverageRibbonParameters,
): readonly IndicatorOutputDefinition[] {
    const shortPeriod = integer(parameters?.shortPeriod, 10, 1, 500, 'shortPeriod');
    const longPeriod = integer(parameters?.longPeriod, 100, 1, 1_000, 'longPeriod');
    const ribbonCount = integer(parameters?.ribbonCount, 10, 2, 500, 'ribbonCount');
    return movingAverageRibbonLengths(shortPeriod, longPeriod, ribbonCount).map((length, index) => ({
        id: `ribbon${index}`,
        name: `SMA ${length}`,
        defaultStyle: style(
            IndicatorSeriesStyle.Line,
            RIBBON_COLORS[index % RIBBON_COLORS.length],
            index === 0 ? 2 : 1,
        ),
    }));
}

export const DEFAULT_MOVING_AVERAGE_RIBBON_OUTPUTS = movingAverageRibbonOutputs({
    shortPeriod: 10,
    longPeriod: 100,
    ribbonCount: 10,
});

export class MovingAverageRibbonProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MovingAverageRibbonCheckpoint
> {
    readonly lengths: readonly number[];
    private readonly averages: readonly SimpleMovingAverage[];

    constructor(shortPeriod: number, longPeriod: number, ribbonCount: number) {
        const lengths = movingAverageRibbonLengths(shortPeriod, longPeriod, ribbonCount);
        super(lengths.map((_, index) => `ribbon${index}`));
        this.lengths = lengths;
        this.averages = Object.freeze(lengths.map((length) => (
            new SimpleMovingAverage(length)
        )));
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        let current = finite(input.value?.close);
        const values = this.averages.map((average, index) => {
            let value: number | null = null;
            if (current !== null) {
                value = commit ? average.push(current) : average.preview(current);
                current = average.isFormed ? value : null;
            }
            return this.formedOutput(
                `ribbon${index}`,
                value,
                average.isFormed,
                input.index,
            );
        });
        return {
            isFormed: this.averages[this.averages.length - 1].isFormed,
            values,
        };
    }

    protected resetState(): void {
        for (const average of this.averages) average.reset();
    }

    protected captureState(): MovingAverageRibbonCheckpoint {
        return Object.freeze({
            averages: Object.freeze(this.averages.map((average) => average.checkpoint())),
        });
    }

    protected restoreState(state: MovingAverageRibbonCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.averages)
            || state.averages.length !== this.averages.length) {
            throw new TypeError('sschart: invalid Moving Average Ribbon checkpoint');
        }
        this.averages.forEach((average, index) => average.restore(state.averages[index]));
    }
}

export const MovingAverageRibbonIndicator: IndicatorDefinition<
    IndicatorCandle,
    MovingAverageRibbonParameters
> = registerIndicator({
    id: 'MovingAverageRibbon',
    name: 'Moving Average Ribbon',
    description: 'Parameter-sized sequence of cascaded simple moving averages.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortPeriod', name: 'Short Period', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 1, max: 500, step: 1,
        },
        {
            id: 'longPeriod', name: 'Long Period', type: IndicatorParameterType.Integer,
            defaultValue: 100, min: 1, max: 1_000, step: 1,
        },
        {
            id: 'ribbonCount', name: 'Ribbon Count', type: IndicatorParameterType.Integer,
            defaultValue: 10, min: 2, max: 500, step: 1,
        },
    ],
    outputs: DEFAULT_MOVING_AVERAGE_RIBBON_OUTPUTS,
    outputFactory: movingAverageRibbonOutputs,
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['maribbon', 'movingaverageribbon'],
    processorFactory: (parameters) => new MovingAverageRibbonProcessor(
        integer(parameters?.shortPeriod, 10, 1, 500, 'shortPeriod'),
        integer(parameters?.longPeriod, 100, 1, 1_000, 'longPeriod'),
        integer(parameters?.ribbonCount, 10, 2, 500, 'ribbonCount'),
    ),
});
