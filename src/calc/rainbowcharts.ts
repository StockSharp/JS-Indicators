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

export interface RainbowChartsParameters extends IndicatorParameters {
    readonly lines: number;
}

export interface RainbowChartsCheckpoint {
    readonly averages: readonly RollingWindowCheckpoint[];
}

export function rainbowChartsOutputs(
    parameters: RainbowChartsParameters,
): readonly IndicatorOutputDefinition[] {
    const lines = integer(parameters?.lines, 10, 2, 500, 'lines');
    return Array.from({ length: lines - 1 }, (_, index) => {
        const line = index + 1;
        return {
            id: `sma${line}`,
            name: `SMA ${line * 2}`,
            defaultStyle: style(
                IndicatorSeriesStyle.Line,
                RIBBON_COLORS[index % RIBBON_COLORS.length],
                index === 0 ? 2 : 1,
            ),
        };
    });
}

export const DEFAULT_RAINBOW_CHARTS_OUTPUTS = rainbowChartsOutputs({ lines: 10 });

export class RainbowChartsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RainbowChartsCheckpoint
> {
    private readonly averages: readonly SimpleMovingAverage[];

    constructor(readonly lines: number) {
        integer(lines, lines, 2, 500, 'lines');
        const lengths = Array.from({ length: lines - 1 }, (_, index) => (index + 1) * 2);
        super(lengths.map((_, index) => `sma${index + 1}`));
        this.averages = Object.freeze(lengths.map((length) => (
            new SimpleMovingAverage(length)
        )));
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const values = this.averages.map((average, index) => this.formedOutput(
            `sma${index + 1}`,
            commit ? average.push(close) : average.preview(close),
            average.isFormed,
            input.index,
        ));
        return {
            isFormed: this.averages[this.averages.length - 1].isFormed,
            values,
        };
    }

    protected resetState(): void {
        for (const average of this.averages) average.reset();
    }

    protected captureState(): RainbowChartsCheckpoint {
        return Object.freeze({
            averages: Object.freeze(this.averages.map((average) => average.checkpoint())),
        });
    }

    protected restoreState(state: RainbowChartsCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || !Array.isArray(state.averages)
            || state.averages.length !== this.averages.length) {
            throw new TypeError('sschart: invalid Rainbow Charts checkpoint');
        }
        this.averages.forEach((average, index) => average.restore(state.averages[index]));
    }
}

export const RainbowChartsIndicator: IndicatorDefinition<
    IndicatorCandle,
    RainbowChartsParameters
> = registerIndicator({
    id: 'RainbowCharts',
    name: 'Rainbow Charts',
    description: 'A configurable fan of independent even-period simple moving averages.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'lines', name: 'Lines', type: IndicatorParameterType.Integer,
        defaultValue: 10, min: 2, max: 500, step: 1,
    }],
    outputs: DEFAULT_RAINBOW_CHARTS_OUTPUTS,
    outputFactory: rainbowChartsOutputs,
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['rainbow', 'rainbowcharts'],
    processorFactory: (parameters) => new RainbowChartsProcessor(
        integer(parameters?.lines, 10, 2, 500, 'lines'),
    ),
});
