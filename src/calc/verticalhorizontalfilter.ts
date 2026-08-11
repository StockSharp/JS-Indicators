import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    RangeLengthParameters,
    lineStyle,
} from './shared/range.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface VerticalHorizontalFilterCheckpoint {
    readonly previousClose: number | null;
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
    readonly movement: RollingWindowCheckpoint;
}

export class VerticalHorizontalFilterProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    VerticalHorizontalFilterCheckpoint
> {
    private previousClose: number | null = null;
    private readonly highest: RollingMaximum;
    private readonly lowest: RollingMinimum;
    private readonly movement: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500)
            throw new RangeError('sschart: indicator length must be an integer from 1 to 500');
        this.highest = new RollingMaximum(length);
        this.lowest = new RollingMinimum(length);
        this.movement = new RollingSum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const change = close === null || this.previousClose === null
            ? null
            : Math.abs(close - this.previousClose);
        const highest = commit ? this.highest.push(high) : this.highest.preview(high);
        const lowest = commit ? this.lowest.push(low) : this.lowest.preview(low);
        const movement = commit ? this.movement.push(change) : this.movement.preview(change);
        if (commit) this.previousClose = close;

        const formed = highest !== null && lowest !== null && movement !== null;
        const value = !formed || movement === 0
            ? null
            : finite((highest - lowest) / movement);
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = null;
        this.highest.reset();
        this.lowest.reset();
        this.movement.reset();
    }

    protected captureState(): VerticalHorizontalFilterCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            highest: this.highest.checkpoint(),
            lowest: this.lowest.checkpoint(),
            movement: this.movement.checkpoint(),
        });
    }

    protected restoreState(state: VerticalHorizontalFilterCheckpoint): void {
        const valid = (checkpoint: RollingWindowCheckpoint) => (
            checkpoint !== null
            && typeof checkpoint === 'object'
            && Array.isArray(checkpoint.values)
            && checkpoint.values.length <= this.length
            && checkpoint.values.every((value) => value === null || finite(value) !== null)
        );
        if (state === null || typeof state !== 'object'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || !valid(state.highest) || !valid(state.lowest) || !valid(state.movement)
            || state.highest.values.length !== state.lowest.values.length
            || state.highest.values.length !== state.movement.values.length) {
            throw new TypeError('sschart: invalid Vertical Horizontal Filter checkpoint');
        }
        this.highest.restore(state.highest);
        this.lowest.restore(state.lowest);
        this.movement.restore(state.movement);
        this.previousClose = state.previousClose;
    }
}

export const VerticalHorizontalFilterIndicator: IndicatorDefinition<
    IndicatorCandle,
    RangeLengthParameters
> = registerIndicator({
    id: 'VerticalHorizontalFilter',
    name: 'Vertical Horizontal Filter',
    description: 'Price range divided by total absolute close movement over the same window.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 15, min: 1, max: 500, step: 1,
    }],
    outputs: [{ id: 'line', name: 'VHF', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['vhf', 'verticalhorizontalfilter'],
    processorFactory: (parameters) => new VerticalHorizontalFilterProcessor(
        length(parameters?.length, 15),
    ),
});
