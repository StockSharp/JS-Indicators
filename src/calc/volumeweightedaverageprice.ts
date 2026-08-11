import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    PRICE_LINE_STYLE,
    typicalPrice,
} from './shared/cumulative-price.js';
import {
    finite,
} from './shared/guards.js';

export interface VolumeWeightedAveragePriceCheckpoint {
    readonly priceVolume: number;
    readonly volume: number;
}

export class VolumeWeightedAveragePriceProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VolumeWeightedAveragePriceCheckpoint
> {
    private priceVolume = 0;
    private volume = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const typical = typicalPrice(input.value);
        const incomingVolume = finite(input.value?.volume);
        let priceVolume = this.priceVolume;
        let volume = this.volume;
        if (typical !== null && incomingVolume !== null) {
            priceVolume += typical * incomingVolume;
            volume += incomingVolume;
        }
        if (commit) {
            this.priceVolume = priceVolume;
            this.volume = volume;
        }
        const value = volume > 0 ? priceVolume / volume : null;
        return {
            isFormed: commit,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.priceVolume = 0;
        this.volume = 0;
    }

    protected captureState(): VolumeWeightedAveragePriceCheckpoint {
        return Object.freeze({
            priceVolume: this.priceVolume,
            volume: this.volume,
        });
    }

    protected restoreState(state: VolumeWeightedAveragePriceCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.priceVolume) === null || finite(state.volume) === null) {
            throw new TypeError('sschart: invalid VWAP checkpoint');
        }
        this.priceVolume = state.priceVolume;
        this.volume = state.volume;
    }
}

export const VolumeWeightedAveragePriceIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'VolumeWeightedAveragePrice',
    name: 'Volume Weighted Average Price',
    description: 'Cumulative typical price weighted by volume from the input session start.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'VWAP', defaultStyle: PRICE_LINE_STYLE }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['vwap', 'volumeweightedaverageprice'],
    processorFactory: () => new VolumeWeightedAveragePriceProcessor(),
});
