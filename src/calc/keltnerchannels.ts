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
    ExpandingAverageTrueRange,
    PartialSeedExponentialMovingAverage,
    type ExpandingAverageTrueRangeCheckpoint,
    type PartialSeedExponentialMovingAverageCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface KeltnerChannelsParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiplier: number;
}

export interface KeltnerChannelsCheckpoint {
    readonly middle: PartialSeedExponentialMovingAverageCheckpoint;
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
}

export class KeltnerChannelsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    KeltnerChannelsCheckpoint
> {
    private readonly middle: PartialSeedExponentialMovingAverage;
    private readonly averageTrueRange: ExpandingAverageTrueRange;

    constructor(readonly length: number, readonly multiplier: number) {
        super(['upper', 'middle', 'lower']);
        integer(length, length, 1, 500, 'length');
        number(multiplier, multiplier, 0.000001, 500, 'multiplier');
        this.middle = new PartialSeedExponentialMovingAverage(length);
        this.averageTrueRange = new ExpandingAverageTrueRange(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const middle = commit ? this.middle.push(close) : this.middle.preview(close);
        const averageTrueRange = commit
            ? this.averageTrueRange.push(input.value)
            : this.averageTrueRange.preview(input.value);

        const formed = input.index + 1 >= this.length
            && middle !== null && averageTrueRange !== null;
        const offset = formed ? this.multiplier * averageTrueRange : null;
        return {
            isFormed: formed,
            values: [
                this.output('upper', formed ? middle + offset! : null, input.index),
                this.output('middle', formed ? middle : null, input.index),
                this.output('lower', formed ? middle - offset! : null, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.middle.reset();
        this.averageTrueRange.reset();
    }

    protected captureState(): KeltnerChannelsCheckpoint {
        return Object.freeze({
            middle: this.middle.checkpoint(),
            averageTrueRange: this.averageTrueRange.checkpoint(),
        });
    }

    protected restoreState(state: KeltnerChannelsCheckpoint): void {
        if (state === null || typeof state !== 'object') {
            throw new TypeError('sschart: invalid Keltner Channels checkpoint');
        }
        this.middle.restore(state.middle);
        this.averageTrueRange.restore(state.averageTrueRange);
    }
}

export const KeltnerChannelsIndicator: IndicatorDefinition<
    IndicatorCandle,
    KeltnerChannelsParameters
> = registerIndicator({
    id: 'KeltnerChannels',
    name: 'Keltner Channels',
    description: 'EMA center line surrounded by Average True Range channel boundaries.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 20, min: 1, max: 500, step: 1,
        },
        {
            id: 'multiplier', name: 'Multiplier', type: IndicatorParameterType.Number,
            defaultValue: 2, min: 0.000001, max: 500, step: 0.1,
        },
    ],
    outputs: [
        { id: 'upper', name: 'Upper', defaultStyle: style(IndicatorSeriesStyle.Line, '#ef5350') },
        { id: 'middle', name: 'Middle', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'lower', name: 'Lower', defaultStyle: style(IndicatorSeriesStyle.Line, '#26a69a') },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['keltner', 'keltnerchannels'],
    processorFactory: (parameters) => new KeltnerChannelsProcessor(
        integer(parameters?.length, 20, 1, 500, 'length'),
        number(parameters?.multiplier, 2, 0.000001, 500, 'multiplier'),
    ),
});
