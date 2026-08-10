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
    RollingStandardDeviation,
    SimpleMovingAverage,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    BollingerBandsCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface BollingerBandsParameters extends IndicatorParameters {
    readonly length: number;
    readonly width: number;
}

export class BollingerBandsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    BollingerBandsCheckpoint
> {
    private readonly average: SimpleMovingAverage;
    private readonly deviation: RollingStandardDeviation;

    constructor(readonly length: number, readonly multiplier: number) {
        super(['upper', 'middle', 'lower']);
        this.average = new SimpleMovingAverage(length);
        this.deviation = new RollingStandardDeviation(length);
        number(multiplier, 2, 0, 100, 'width');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const middle = commit ? this.average.push(close) : this.average.preview(close);
        const deviation = commit ? this.deviation.push(close) : this.deviation.preview(close);
        const formed = middle !== null && deviation !== null;
        return {
            isFormed: formed,
            values: [
                this.output('upper', formed ? middle + this.multiplier * deviation : null, input.index),
                this.output('middle', formed ? middle : null, input.index),
                this.output('lower', formed ? middle - this.multiplier * deviation : null, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.average.reset();
        this.deviation.reset();
    }
    protected captureState(): BollingerBandsCheckpoint {
        return Object.freeze({
            average: this.average.checkpoint(),
            deviation: this.deviation.checkpoint(),
        });
    }
    protected restoreState(state: BollingerBandsCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.average?.values?.length !== state.deviation?.values?.length) {
            throw new TypeError('sschart: invalid Bollinger Bands checkpoint');
        }
        this.average.restore(state.average);
        this.deviation.restore(state.deviation);
    }
}

export const BollingerBandsIndicator: IndicatorDefinition<
    IndicatorCandle,
    BollingerBandsParameters
> = registerIndicator({
    id: 'BollingerBands',
    name: 'Bollinger Bands',
    description: 'Moving-average envelope at a configurable population standard deviation.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 32, min: 1, max: 500, step: 1,
        },
        {
            id: 'width', name: 'Deviation', type: IndicatorParameterType.Number,
            defaultValue: 2, min: 0.1, max: 5, step: 0.1,
        },
    ],
    outputs: [
        { id: 'upper', name: 'Upper', defaultStyle: style(IndicatorSeriesStyle.Band, '#42a5f5') },
        { id: 'middle', name: 'Middle', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28', 2) },
        { id: 'lower', name: 'Lower', defaultStyle: style(IndicatorSeriesStyle.Band, '#42a5f5') },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['bb'],
    painter: 'band',
    processorFactory: (parameters) => new BollingerBandsProcessor(
        integer(parameters?.length, 20, 1, 500, 'length'),
        number(parameters?.width, 2, 0.1, 5, 'width'),
    ),
});
