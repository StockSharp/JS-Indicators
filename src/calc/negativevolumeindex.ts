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

export interface NegativeVolumeIndexCheckpoint {
    readonly previousClose: number;
    readonly previousVolume: number;
    readonly value: number;
}

export class NegativeVolumeIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    NegativeVolumeIndexCheckpoint
> {
    private previousClose = 0;
    private previousVolume = 0;
    private current = 1_000;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        let value = this.current;
        if (close !== null && volume !== null) {
            if (this.previousClose !== 0 && this.previousVolume !== 0 && volume !== 0
                && volume < this.previousVolume) {
                value = finite(
                    this.current + this.current * (close - this.previousClose) / this.previousClose,
                ) ?? this.current;
            }
            if (commit) {
                this.previousClose = close;
                this.previousVolume = volume;
                this.current = value;
            }
        }
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.previousVolume = 0;
        this.current = 1_000;
    }

    protected captureState(): NegativeVolumeIndexCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            previousVolume: this.previousVolume,
            value: this.current,
        });
    }

    protected restoreState(state: NegativeVolumeIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null
            || finite(state.previousVolume) === null
            || finite(state.value) === null) {
            throw new TypeError('sschart: invalid Negative Volume Index checkpoint');
        }
        this.previousClose = state.previousClose;
        this.previousVolume = state.previousVolume;
        this.current = state.value;
    }
}

export const NegativeVolumeIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'NegativeVolumeIndex',
    name: 'Negative Volume Index',
    description: 'Cumulative price index updated only when volume declines.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'line', name: 'NVI',
        defaultStyle: lineStyle('#26a69a'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['nvi', 'negativevolumeindex'],
    processorFactory: () => new NegativeVolumeIndexProcessor(),
});
