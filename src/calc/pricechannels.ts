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
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    CompoundLengthParameters,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface PriceChannelsCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export class PriceChannelsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PriceChannelsCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(['upper', 'lower']);
        integer(length, length, 1, 500, 'length');
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const upper = commit
            ? this.high.push(finite(input.value?.high))
            : this.high.preview(finite(input.value?.high));
        const lower = commit
            ? this.low.push(finite(input.value?.low))
            : this.low.preview(finite(input.value?.low));
        const formed = upper !== null && lower !== null;
        return {
            isFormed: formed,
            values: [
                this.output('upper', formed ? upper : null, input.index),
                this.output('lower', formed ? lower : null, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }

    protected captureState(): PriceChannelsCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }

    protected restoreState(state: PriceChannelsCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.high?.values?.length !== state.low?.values?.length) {
            throw new TypeError('sschart: invalid Price Channels checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const PriceChannelsIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompoundLengthParameters
> = registerIndicator({
    id: 'PriceChannels',
    name: 'Price Channels',
    description: 'Trailing highest-high and lowest-low price channel.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 20, min: 1, max: 500, step: 1,
    }],
    outputs: [
        {
            id: 'upper', name: 'Upper',
            defaultStyle: style(IndicatorSeriesStyle.Band, '#42a5f5'),
        },
        {
            id: 'lower', name: 'Lower',
            defaultStyle: style(IndicatorSeriesStyle.Band, '#42a5f5'),
        },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['pc', 'pricechannels'],
    painter: 'band',
    processorFactory: (parameters) => new PriceChannelsProcessor(
        integer(parameters?.length, 20, 1, 500, 'length'),
    ),
});
