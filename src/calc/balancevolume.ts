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

export interface BalanceVolumeCheckpoint {
    readonly seeded: boolean;
    readonly previousClose: number;
    readonly cumulative: number;
}

export class BalanceVolumeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    BalanceVolumeCheckpoint
> {
    private seeded = false;
    private previousClose = 0;
    private cumulative = 0;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        if (!this.seeded) {
            if (commit && close !== null) {
                this.seeded = true;
                this.previousClose = close;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        let value: number | null = null;
        if (close !== null && volume !== null) {
            value = this.cumulative;
            if (close > this.previousClose) value += volume;
            else if (close < this.previousClose) value -= volume;
            if (commit) {
                this.previousClose = close;
                this.cumulative = value;
            }
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.seeded = false;
        this.previousClose = 0;
        this.cumulative = 0;
    }
    protected captureState(): BalanceVolumeCheckpoint {
        return Object.freeze({
            seeded: this.seeded,
            previousClose: this.previousClose,
            cumulative: this.cumulative,
        });
    }
    protected restoreState(state: BalanceVolumeCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.seeded !== 'boolean'
            || finite(state.previousClose) === null || finite(state.cumulative) === null) {
            throw new TypeError('sschart: invalid balance volume checkpoint');
        }
        this.seeded = state.seeded;
        this.previousClose = state.previousClose;
        this.cumulative = state.cumulative;
    }
}

export const BalanceVolumeIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'BalanceVolume',
    name: 'Balance Volume',
    description: 'Balance-volume variant whose first valid bar is an empty value.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Balance Volume', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['obv', 'balancevolume'],
    processorFactory: () => new BalanceVolumeProcessor(),
});
