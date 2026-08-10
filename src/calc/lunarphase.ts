import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    lunarPhaseFromMilliseconds,
} from '../math/index.js';

export class LunarPhaseProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor() {
        super(['line']);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const value = lunarPhaseFromMilliseconds(input.time * 1_000);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { /* stateless */ }

    protected captureState(): null { return null; }

    protected restoreState(state: null): void {
        if (state !== null)
            throw new TypeError('sschart: invalid Lunar Phase checkpoint');
    }
}

export const LunarPhaseIndicator: IndicatorDefinition<IndicatorCandle> = registerIndicator({
    id: 'LunarPhase',
    name: 'Lunar Phase',
    description: 'Eight-part lunar cycle phase derived from each candle timestamp.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'line',
        name: 'Lunar Phase',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#7e57c2',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['lunarphase'],
    scaleRange: { min: 0, max: 7 },
    processorFactory: () => new LunarPhaseProcessor(),
});
