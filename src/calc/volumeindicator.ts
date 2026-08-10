import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    finite,
} from './shared/guards.js';

/** Stateless candle-volume pass-through with a painter direction hint. */
export class VolumeIndicatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    null
> {
    constructor() { super(['value']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const volume = finite(input.value?.volume);
        const open = finite(input.value?.open);
        const close = finite(input.value?.close);
        const up = open !== null && close !== null ? close >= open : true;
        return {
            isFormed: volume !== null,
            values: [this.output('value', volume, input.index, { up })],
        };
    }

    protected resetState(): void {}
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null) throw new TypeError('sschart: invalid Volume checkpoint');
    }
}

export const VolumeIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'VolumeIndicator',
    name: 'Volume',
    description: 'Per-candle traded volume colored by the candle direction.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'value',
        name: 'Volume',
        defaultStyle: {
            series: IndicatorSeriesStyle.Histogram,
            color: '#4a9eff',
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['volume'],
    painter: 'volume',
    processorFactory: () => new VolumeIndicatorProcessor(),
});
