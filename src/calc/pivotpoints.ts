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
    style,
} from './shared/compound.js';
import {
    finite,
} from './shared/guards.js';

export class PivotPointsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    null
> {
    constructor() { super(['pp', 'r1', 'r2', 's1', 's2']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        if (high === null || low === null || close === null) {
            return {
                isFormed: false,
                values: [
                    this.output('pp', null, input.index),
                    this.output('r1', null, input.index),
                    this.output('r2', null, input.index),
                    this.output('s1', null, input.index),
                    this.output('s2', null, input.index),
                ],
            };
        }

        const pivot = (high + low + close) / 3;
        const range = high - low;
        return {
            isFormed: true,
            values: [
                this.output('pp', pivot, input.index),
                this.output('r1', 2 * pivot - low, input.index),
                this.output('r2', pivot + range, input.index),
                this.output('s1', 2 * pivot - high, input.index),
                this.output('s2', pivot - range, input.index),
            ],
        };
    }

    protected resetState(): void { /* stateless */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null) throw new TypeError('sschart: invalid Pivot Points checkpoint');
    }
}

export const PivotPointsIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'PivotPoints',
    name: 'Pivot Points',
    description: 'Classic pivot, resistance and support levels calculated from each candle.',
    category: IndicatorCategory.SupportResistance,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [
        { id: 'pp', name: 'Pivot Point', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28', 2) },
        { id: 'r1', name: 'Resistance 1', defaultStyle: style(IndicatorSeriesStyle.Line, '#ef5350') },
        { id: 'r2', name: 'Resistance 2', defaultStyle: style(IndicatorSeriesStyle.Line, '#e53935') },
        { id: 's1', name: 'Support 1', defaultStyle: style(IndicatorSeriesStyle.Line, '#66bb6a') },
        { id: 's2', name: 'Support 2', defaultStyle: style(IndicatorSeriesStyle.Line, '#43a047') },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['pivotpoints'],
    processorFactory: () => new PivotPointsProcessor(),
});
