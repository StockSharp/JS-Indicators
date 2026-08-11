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
    CycleLengthParameters,
} from './shared/cycle.js';
import {
    length,
} from './shared/guards.js';

export class SineWaveProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    private readonly step: number;

    constructor(readonly length: number) {
        super(['sine', 'leadsine']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Sine Wave length must be an integer from 1 to 500',
            );
        }
        this.step = 2 * Math.PI / length;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        _commit: boolean,
    ): IndicatorCalculationResult {
        const sine = Math.sin(this.step * input.index);
        const leadSine = Math.sin(this.step * (input.index + 0.5));
        return {
            isFormed: input.index + 1 >= this.length,
            values: [
                this.formedOutput('sine', sine, true, input.index),
                this.formedOutput('leadsine', leadSine, true, input.index),
            ],
        };
    }

    protected resetState(): void { /* phase is derived from the sequential position */ }
    protected captureState(): null { return null; }
    protected restoreState(state: null): void {
        if (state !== null) throw new TypeError('sschart: invalid Sine Wave checkpoint');
    }
}

export const SineWaveIndicator: IndicatorDefinition<
    IndicatorCandle,
    CycleLengthParameters
> = registerIndicator({
    id: 'SineWave',
    name: 'Sine Wave',
    description: 'Synthetic main and half-bar-leading sine waves driven by bar position.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [
        {
            id: 'sine', name: 'Sine',
            defaultStyle: {
                series: IndicatorSeriesStyle.Line,
                color: '#42a5f5',
                lineWidth: 2,
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'leadsine', name: 'Lead Sine',
            defaultStyle: {
                series: IndicatorSeriesStyle.Line,
                color: '#ff7043',
                lineWidth: 1,
                options: { priceLineVisible: false },
            },
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['sinewave'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new SineWaveProcessor(
        length(parameters?.length, 14),
    ),
});
