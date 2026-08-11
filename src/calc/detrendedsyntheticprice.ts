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
} from '../math/index.js';
import {
    CompoundLengthParameters,
    DonchianChannelsCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export class DetrendedSyntheticPriceProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DonchianChannelsCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const highest = commit ? this.high.push(high) : this.high.preview(high);
        const lowest = commit ? this.low.push(low) : this.low.preview(low);
        const value = highest === null || lowest === null ? null : (highest + lowest) / 2;
        return {
            isFormed: this.high.isFormed && this.low.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }

    protected captureState(): DonchianChannelsCheckpoint {
        return Object.freeze({ high: this.high.checkpoint(), low: this.low.checkpoint() });
    }

    protected restoreState(state: DonchianChannelsCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.high?.values?.length !== state.low?.values?.length) {
            throw new TypeError('sschart: invalid Detrended Synthetic Price checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const DetrendedSyntheticPriceIndicator: IndicatorDefinition<
    IndicatorCandle,
    CompoundLengthParameters
> = registerIndicator({
    id: 'DetrendedSyntheticPrice',
    name: 'Detrended Synthetic Price',
    description: 'Midpoint of the rolling highest high and lowest low.',
    category: IndicatorCategory.Price,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'Detrended Synthetic Price',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#ffb74d', 2),
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['dsp'],
    processorFactory: (parameters) => new DetrendedSyntheticPriceProcessor(
        integer(parameters?.length, 14, 1, 500, 'length'),
    ),
});
