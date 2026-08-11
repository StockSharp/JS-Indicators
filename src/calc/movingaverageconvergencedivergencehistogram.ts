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

export interface MacdHistogramParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly signalMaLength: number;
}

export class MacdHistogramProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MacdCheckpoint> {
    private readonly kernel: MacdKernel;

    constructor(
        readonly shortMaLength: number,
        readonly longMaLength: number,
        readonly signalMaLength: number,
    ) {
        super(['macd', 'signal', 'histogram']);
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
                this.formedOutput('histogram', value.histogram, this.kernel.signalIsFormed, input.index),
            ],
        };
    }

    protected resetState(): void { this.kernel.reset(); }
    protected captureState(): MacdCheckpoint { return this.kernel.checkpoint(); }
    protected restoreState(state: MacdCheckpoint): void { this.kernel.restore(state); }
}

export const MacdHistogramIndicator: IndicatorDefinition<
    IndicatorCandle,
    MacdHistogramParameters
> = registerIndicator({
    id: 'MovingAverageConvergenceDivergenceHistogram',
    name: 'MACD Histogram',
    description: 'Difference of fast and slow EMA with signal EMA and histogram.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortMaLength', name: 'Fast Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 200, step: 1,
            aliases: ['macdShortMaLength'],
        },
        {
            id: 'longMaLength', name: 'Slow Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 400, step: 1,
            aliases: ['macdLongMaLength'],
        },
        {
            id: 'signalMaLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 9, min: 1, max: 100, step: 1,
        },
    ],
    outputs: [
        { id: 'macd', name: 'MACD Histogram', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'signal', name: 'Signal', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
        { id: 'histogram', name: 'Histogram', defaultStyle: style(IndicatorSeriesStyle.Histogram, '#ab47bc') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['macdhistogram'],
    painter: 'macd-histogram',
    processorFactory: (parameters) => new MacdHistogramProcessor(
        integer(parameters?.shortMaLength, 12, 1, 200, 'shortMaLength'),
        integer(parameters?.longMaLength, 26, 1, 400, 'longMaLength'),
        integer(parameters?.signalMaLength, 9, 1, 100, 'signalMaLength'),
    ),
});
