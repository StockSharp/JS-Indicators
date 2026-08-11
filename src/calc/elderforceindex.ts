import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    FiniteExponentialAverage,
    FiniteExponentialCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface ElderForceIndexParameters extends IndicatorParameters {
    readonly length: number;
}

export interface ElderForceIndexCheckpoint {
    readonly previousClose: number;
    readonly average: FiniteExponentialCheckpoint;
}

export class ElderForceIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ElderForceIndexCheckpoint
> {
    private readonly average: FiniteExponentialAverage;
    private previousClose = 0;

    constructor(readonly length: number) {
        super(['line']);
        this.average = new FiniteExponentialAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        if (close === null) return { isFormed: false, values: [this.output('line', null, input.index)] };

        // The first close has nothing to be measured against, so it only seeds the comparison.
        if (this.previousClose === 0) {
            if (commit) this.previousClose = close;
            return { isFormed: false, values: [this.output('line', null, input.index)] };
        }

        const force = (volume ?? 0) * (close - this.previousClose);
        if (commit) this.previousClose = close;
        const value = commit ? this.average.push(force) : this.average.preview(force);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.average.reset();
    }

    protected captureState(): ElderForceIndexCheckpoint {
        return Object.freeze({ previousClose: this.previousClose, average: this.average.checkpoint() });
    }

    protected restoreState(state: ElderForceIndexCheckpoint): void {
        if (state === null || typeof state !== 'object' || finite(state.previousClose) === null)
            throw new TypeError('sschart: invalid Elder Force Index checkpoint');
        this.previousClose = state.previousClose;
        this.average.restore(state.average);
    }
}

export const ElderForceIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    ElderForceIndexParameters
> = registerIndicator({
    id: 'ElderForceIndex',
    name: 'Elder Force Index',
    description: 'Volume weighted by the change in closing price, smoothed exponentially.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 13, min: 1, max: 500, step: 1,
    }],
    outputs: [
        { id: 'line', name: 'Force Index', defaultStyle: style(IndicatorSeriesStyle.Line, '#26a69a', 2) },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['elderforceindex', 'forceindexelder'],
    painter: 'line',
    levels: [0],
    processorFactory: (parameters) => new ElderForceIndexProcessor(
        integer(parameters?.length, 13, 1, 500, 'length'),
    ),
});
