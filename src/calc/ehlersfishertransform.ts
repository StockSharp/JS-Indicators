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
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    CycleLengthParameters,
} from './shared/cycle.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface EhlersFisherTransformCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
    readonly previousValue: number;
    readonly previousFisher: number;
}

export class EhlersFisherTransformProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    EhlersFisherTransformCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;
    private previousValue = 0;
    private previousFisher = 0;

    constructor(readonly length: number) {
        super(['main', 'trigger']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: Ehlers Fisher length must be a positive integer');
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const currentHigh = finite(input.value?.high);
        const currentLow = finite(input.value?.low);
        // `_highBuffer.Max` / `_lowBuffer.Min` are read as-is on both paths and pushed on a final
        // input only: a forming bar feeds the median price but never widens the range.
        const high = commit ? this.high.push(currentHigh) : this.high.value;
        const low = commit ? this.low.push(currentLow) : this.low.value;
        let main: number | null = null;
        let trigger: number | null = null;
        let nextValue = this.previousValue;
        if (high !== null && low !== null && currentHigh !== null && currentLow !== null) {
            const range = high - low;
            const median = (currentHigh + currentLow) / 2;
            const base = range === 0 ? 0 : 0.5 * ((median - low) / range - 0.5);
            nextValue = Math.max(-0.999, Math.min(0.999, 0.66 * base + 0.67 * this.previousValue));
            main = finite(0.5 * Math.log((1 + nextValue) / (1 - nextValue)));
            if (main !== null) trigger = this.previousFisher;
        }
        if (commit && main !== null) {
            this.previousValue = nextValue;
            this.previousFisher = main;
        }
        const formsNow = commit && main !== null;
        return {
            isFormed: formsNow,
            values: [
                this.output('main', main, input.index),
                this.output('trigger', trigger, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
        this.previousValue = 0;
        this.previousFisher = 0;
    }

    protected captureState(): EhlersFisherTransformCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
            previousValue: this.previousValue,
            previousFisher: this.previousFisher,
        });
    }

    protected restoreState(state: EhlersFisherTransformCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.high?.values?.length !== state.low?.values?.length
            || finite(state.previousValue) === null || finite(state.previousFisher) === null) {
            throw new TypeError('sschart: invalid Ehlers Fisher checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
        this.previousValue = state.previousValue;
        this.previousFisher = state.previousFisher;
    }
}

export const EhlersFisherTransformIndicator: IndicatorDefinition<
    IndicatorCandle,
    CycleLengthParameters
> = registerIndicator({
    id: 'EhlersFisherTransform',
    name: 'Ehlers Fisher Transform',
    description: 'Fisher transform of normalized median price with a lagged trigger.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 10, min: 1, max: 500, step: 1,
    }],
    outputs: [
        {
            id: 'main', name: 'Fisher',
            defaultStyle: {
                series: IndicatorSeriesStyle.Line,
                color: '#42a5f5', lineWidth: 2,
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'trigger', name: 'Trigger',
            defaultStyle: {
                series: IndicatorSeriesStyle.Line,
                color: '#ff7043', lineWidth: 1,
                options: { priceLineVisible: false },
            },
        },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['ehlerfisher'],
    levels: [0],
    processorFactory: (parameters) => new EhlersFisherTransformProcessor(
        length(parameters?.length, 10),
    ),
});
