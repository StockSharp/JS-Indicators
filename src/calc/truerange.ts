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
    LENGTH_STYLE,
    close,
} from './shared/core.js';

export interface TrueRangeIndicatorCheckpoint {
    readonly previousClose: number | null;
}

export class TrueRangeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TrueRangeIndicatorCheckpoint
> {
    private previousClose: number | null = null;

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = input.value?.high;
        const low = input.value?.low;
        const closeValue = close(input);
        if (typeof high !== 'number' || !Number.isFinite(high)
            || typeof low !== 'number' || !Number.isFinite(low)) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        if (this.previousClose === null) {
            if (commit && closeValue !== null) this.previousClose = closeValue;
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        const value = Math.max(
            high - low,
            Math.abs(this.previousClose - high),
            Math.abs(this.previousClose - low),
        );
        if (commit && closeValue !== null) this.previousClose = closeValue;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.previousClose = null; }
    protected captureState(): TrueRangeIndicatorCheckpoint {
        return Object.freeze({ previousClose: this.previousClose });
    }
    protected restoreState(state: TrueRangeIndicatorCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.previousClose !== null
                && (typeof state.previousClose !== 'number'
                    || !Number.isFinite(state.previousClose)))) {
            throw new TypeError('sschart: invalid True Range checkpoint');
        }
        this.previousClose = state.previousClose;
    }
}

export const TrueRangeIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'TrueRange',
    name: 'True Range',
    description: 'Maximum intrabar range or gap from the previous valid close.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{
        id: 'line',
        name: 'TR',
        defaultStyle: { ...LENGTH_STYLE, color: '#ffa726' },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['tr', 'truerange'],
    processorFactory: () => new TrueRangeProcessor(),
});
