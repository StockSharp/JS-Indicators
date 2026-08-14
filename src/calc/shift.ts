import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
} from './shared/cumulative-price.js';
import {
    finite,
} from './shared/guards.js';

export interface ShiftParameters extends IndicatorParameters {
    readonly length: number;
}

/** StockSharp Shift is a warm-up gate; it does not relocate output points. */
export class ShiftProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Shift length must be an integer from 1 to 500',
            );
        }
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const value = input.index < this.length ? null : finite(input.value?.close);
        return {
            // `CalcIsFormed() => _left <= 0` is read before the `finally` that decrements `_left`,
            // so the bar that empties the counter still answers empty while the platform already
            // counts itself formed. Formation latches one bar ahead of the first value.
            isFormed: input.index >= this.length - 1,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* position is owned by the sequential base */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null) throw new TypeError('sschart: invalid Shift checkpoint');
    }
}

export const ShiftIndicator: IndicatorDefinition<IndicatorCandle, ShiftParameters>
    = registerIndicator({
        id: 'Shift',
        name: 'Shift',
        description: 'Passes through the current close after a fixed warm-up count.',
        category: IndicatorCategory.Price,
        input: CandlestickIndicatorInput,
        parameters: [{
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 1, min: 1, max: 500, step: 1,
        }],
        outputs: [{ id: 'line', name: 'Shift', defaultStyle: PRICE_LINE_STYLE }],
        naturalPane: IndicatorPane.Overlay,
        measure: IndicatorMeasure.Price,

        aliases: ['shift'],
        processorFactory: (parameters) => new ShiftProcessor(
            parameters?.length === undefined ? 1 : parameters.length,
        ),
    });
