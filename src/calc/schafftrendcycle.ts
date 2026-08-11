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
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    MacdCheckpoint,
    MacdKernel,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface SchaffTrendCycleParameters extends IndicatorParameters {
    readonly length: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly stochasticKLength: number;
    readonly signalMaLength: number;
}

export interface SchaffTrendCycleCheckpoint {
    readonly macd: MacdCheckpoint;
    readonly closeHigh: RollingWindowCheckpoint;
    readonly closeLow: RollingWindowCheckpoint;
    readonly stochasticHigh: RollingWindowCheckpoint;
    readonly stochasticLow: RollingWindowCheckpoint;
    readonly average: FiniteExponentialCheckpoint;
    readonly previousStochastic: number;
}

export class SchaffTrendCycleProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    SchaffTrendCycleCheckpoint
> {
    private readonly macd: MacdKernel;
    private readonly closeHigh: RollingMaximum;
    private readonly closeLow: RollingMinimum;
    private readonly stochasticHigh: RollingMaximum;
    private readonly stochasticLow: RollingMinimum;
    private readonly average: FiniteExponentialAverage;
    private previousStochastic = 0;

    constructor(
        readonly length: number,
        readonly shortMaLength: number,
        readonly longMaLength: number,
        readonly stochasticKLength: number,
        readonly signalMaLength: number,
    ) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        integer(shortMaLength, shortMaLength, 1, 500, 'shortMaLength');
        integer(longMaLength, longMaLength, 1, 500, 'longMaLength');
        integer(stochasticKLength, stochasticKLength, 1, 500, 'stochasticKLength');
        integer(signalMaLength, signalMaLength, 1, 500, 'signalMaLength');
        this.macd = new MacdKernel(shortMaLength, longMaLength, signalMaLength);
        this.closeHigh = new RollingMaximum(length);
        this.closeLow = new RollingMinimum(length);
        this.stochasticHigh = new RollingMaximum(stochasticKLength);
        this.stochasticLow = new RollingMinimum(stochasticKLength);
        this.average = new FiniteExponentialAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        let closeHigh: number | null;
        let closeLow: number | null;
        if (commit) {
            // StockSharp's DecimalBuffer skips invalid input instead of inserting a gap.
            if (close !== null) {
                this.closeHigh.push(close);
                this.closeLow.push(close);
            }
            closeHigh = this.closeHigh.partialValue;
            closeLow = this.closeLow.partialValue;
        } else if (close === null) {
            closeHigh = this.closeHigh.partialValue;
            closeLow = this.closeLow.partialValue;
        } else {
            closeHigh = this.closeHigh.previewPartial(close);
            closeLow = this.closeLow.previewPartial(close);
        }

        const macd = commit ? this.macd.push(close) : this.macd.preview(close);
        if (!this.macd.signalIsFormed
            || macd.histogram === null || closeHigh === null || closeLow === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const closeRange = closeHigh - closeLow;
        let stochastic: number;
        let stochasticFormed: boolean;
        if (closeRange === 0) {
            // The C# implementation reuses the last %K and deliberately does not
            // advance the inner stochastic window in this branch.
            stochastic = this.previousStochastic;
            stochasticFormed = this.stochasticHigh.isFormed;
        } else {
            const raw = finite((macd.histogram - closeLow) / closeRange);
            if (raw === null) {
                return {
                    isFormed: false,
                    values: [this.output('line', null, input.index)],
                };
            }

            let stochasticHigh: number | null;
            let stochasticLow: number | null;
            if (commit) {
                this.stochasticHigh.push(raw);
                this.stochasticLow.push(raw);
                stochasticHigh = this.stochasticHigh.partialValue;
                stochasticLow = this.stochasticLow.partialValue;
                stochasticFormed = this.stochasticHigh.isFormed
                    && this.stochasticLow.isFormed;
            } else {
                stochasticHigh = this.stochasticHigh.previewPartial(raw);
                stochasticLow = this.stochasticLow.previewPartial(raw);
                stochasticFormed = this.stochasticHigh.preview(raw) !== null
                    && this.stochasticLow.preview(raw) !== null;
            }
            if (stochasticHigh === null || stochasticLow === null) {
                return {
                    isFormed: false,
                    values: [this.output('line', null, input.index)],
                };
            }
            const stochasticRange = stochasticHigh - stochasticLow;
            stochastic = stochasticRange === 0
                ? 0
                : 100 * (raw - stochasticLow) / stochasticRange;
        }

        if (!stochasticFormed) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        if (commit) this.previousStochastic = stochastic;
        const value = commit
            ? this.average.push(stochastic)
            : this.average.preview(stochastic);
        return {
            isFormed: this.macd.signalIsFormed
                && stochasticFormed
                && this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.macd.reset();
        this.closeHigh.reset();
        this.closeLow.reset();
        this.stochasticHigh.reset();
        this.stochasticLow.reset();
        this.average.reset();
        this.previousStochastic = 0;
    }

    protected captureState(): SchaffTrendCycleCheckpoint {
        return Object.freeze({
            macd: this.macd.checkpoint(),
            closeHigh: this.closeHigh.checkpoint(),
            closeLow: this.closeLow.checkpoint(),
            stochasticHigh: this.stochasticHigh.checkpoint(),
            stochasticLow: this.stochasticLow.checkpoint(),
            average: this.average.checkpoint(),
            previousStochastic: this.previousStochastic,
        });
    }

    protected restoreState(state: SchaffTrendCycleCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousStochastic) === null) {
            throw new TypeError('sschart: invalid Schaff Trend Cycle checkpoint');
        }
        this.macd.restore(state.macd);
        this.closeHigh.restore(state.closeHigh);
        this.closeLow.restore(state.closeLow);
        this.stochasticHigh.restore(state.stochasticHigh);
        this.stochasticLow.restore(state.stochasticLow);
        this.average.restore(state.average);
        this.previousStochastic = state.previousStochastic;
    }
}

export const SchaffTrendCycleIndicator: IndicatorDefinition<
    IndicatorCandle,
    SchaffTrendCycleParameters
> = registerIndicator({
    id: 'SchaffTrendCycle',
    name: 'Schaff Trend Cycle',
    description: 'MACD histogram transformed by StockSharp stochastic-cycle logic and EMA smoothing.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 32, min: 1, max: 500, step: 1,
        },
        {
            id: 'shortMaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 23, min: 1, max: 500, step: 1,
            aliases: ['macdMacdShortMaLength'],
        },
        {
            id: 'longMaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 50, min: 1, max: 500, step: 1,
            aliases: ['macdMacdLongMaLength'],
        },
        {
            id: 'stochasticKLength', name: 'Cycle Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
        {
            id: 'signalMaLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 3, min: 1, max: 500, step: 1,
            aliases: ['macdSignalMaLength'],
        },
    ],
    outputs: [{
        id: 'line',
        name: 'STC',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#26c6da', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['stc', 'schafftrendcycle'],
    scaleRange: { min: 0, max: 100 },
    levels: [25, 75],
    processorFactory: (parameters) => new SchaffTrendCycleProcessor(
        integer(parameters?.length, 10, 1, 500, 'length'),
        integer(parameters?.shortMaLength, 23, 1, 500, 'shortMaLength'),
        integer(parameters?.longMaLength, 50, 1, 500, 'longMaLength'),
        integer(parameters?.stochasticKLength, 5, 1, 500, 'stochasticKLength'),
        integer(parameters?.signalMaLength, 3, 1, 500, 'signalMaLength'),
    ),
});
