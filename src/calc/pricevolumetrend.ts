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
    lineStyle,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface PriceVolumeTrendCheckpoint {
    readonly previousClose: number;
    readonly value: number;
}

export class PriceVolumeTrendProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    PriceVolumeTrendCheckpoint
> {
    private previousClose = 0;
    private current = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        if (close === null || volume === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        if (this.previousClose === 0) {
            if (commit) this.previousClose = close;
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const value = finite(
            this.current + volume * (close - this.previousClose) / this.previousClose,
        );
        if (commit) {
            this.previousClose = close;
            if (value !== null) this.current = value;
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.current = 0;
    }

    protected captureState(): PriceVolumeTrendCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            value: this.current,
        });
    }

    protected restoreState(state: PriceVolumeTrendCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null || finite(state.value) === null) {
            throw new TypeError('sschart: invalid Price Volume Trend checkpoint');
        }
        this.previousClose = state.previousClose;
        this.current = state.value;
    }
}

export const PriceVolumeTrendIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'PriceVolumeTrend',
    name: 'Price Volume Trend',
    description: 'Cumulative volume weighted by the relative change in closing price.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'line', name: 'PVT',
        defaultStyle: lineStyle('#26c6da'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['pvt', 'pricevolumetrend'],
    processorFactory: () => new PriceVolumeTrendProcessor(),
});
