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
} from './shared/range.js';
import {
    finite,
    number,
} from './shared/guards.js';

export class BalanceOfPowerProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    null
> {
    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const open = finite(input.value?.open);
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        let value: number | null = null;
        if (open !== null && high !== null && low !== null && close !== null) {
            const range = high - low;
            if (range !== 0) {
                const raw = (close - open) / range;
                if (Number.isFinite(raw)) value = Math.max(-1, Math.min(1, raw));
            }
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {}
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null) throw new TypeError('sschart: invalid Balance of Power checkpoint');
    }
}

export const BalanceOfPowerIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'BalanceOfPower',
    name: 'Balance Of Power',
    description: 'Close-to-open movement normalized by the full candle range.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Balance Of Power', defaultStyle: lineStyle('#26a69a') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['balanceofpower'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: () => new BalanceOfPowerProcessor(),
});
