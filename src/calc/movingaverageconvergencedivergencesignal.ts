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
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    MacdCheckpoint,
    MacdKernel,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface MacdSignalParameters extends IndicatorParameters {
    readonly longMaLength: number;
    readonly shortMaLength: number;
    readonly signalMaLength: number;
}

export class MacdSignalProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    MacdCheckpoint
> {
    private readonly kernel: MacdKernel;

    constructor(
        readonly longMaLength: number,
        readonly shortMaLength: number,
        readonly signalMaLength: number,
    ) {
        super(['macd', 'signal']);
        integer(longMaLength, longMaLength, 1, 500, 'longMaLength');
        integer(shortMaLength, shortMaLength, 1, 500, 'shortMaLength');
        integer(signalMaLength, signalMaLength, 1, 500, 'signalMaLength');
        this.kernel = new MacdKernel(shortMaLength, longMaLength, signalMaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = commit
            ? this.kernel.push(finite(input.value?.close))
            : this.kernel.preview(finite(input.value?.close));
        return {
            isFormed: this.kernel.signalIsFormed,
            values: [
                this.formedOutput('macd', value.macd, this.kernel.macdIsFormed, input.index),
                this.formedOutput('signal', value.signal, this.kernel.signalIsFormed, input.index),
            ],
        };
    }

    protected resetState(): void { this.kernel.reset(); }
    protected captureState(): MacdCheckpoint { return this.kernel.checkpoint(); }
    protected restoreState(state: MacdCheckpoint): void { this.kernel.restore(state); }
}

export const MacdSignalIndicator: IndicatorDefinition<
    IndicatorCandle,
    MacdSignalParameters
> = registerIndicator({
    id: 'MovingAverageConvergenceDivergenceSignal',
    name: 'Moving Average Convergence Divergence Signal',
    description: 'MACD and its exponential signal line as a two-value composite.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'longMaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 500, step: 1,
            aliases: ['macdLongMaLength'],
        },
        {
            id: 'shortMaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 500, step: 1,
            aliases: ['macdShortMaLength'],
        },
        {
            id: 'signalMaLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        {
            id: 'macd', name: 'MACD',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
        },
        {
            id: 'signal', name: 'Signal',
            defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28'),
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['macdsignal'],
    painter: 'dual-line',
    processorFactory: (parameters) => new MacdSignalProcessor(
        integer(parameters?.longMaLength, 26, 1, 500, 'longMaLength'),
        integer(parameters?.shortMaLength, 12, 1, 500, 'shortMaLength'),
        integer(parameters?.signalMaLength, 9, 1, 500, 'signalMaLength'),
    ),
});
