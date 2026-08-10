import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface DemandIndexCheckpoint {
    readonly previousClose: number;
    readonly previousVolume: number;
    readonly previousValue: number | null;
    readonly average: RollingWindowCheckpoint;
}

export class DemandIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DemandIndexCheckpoint
> {
    private previousClose = 0;
    private previousVolume = 0;
    private previousValue: number | null = null;
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const volume = finite(input.value?.volume);
        if (close === null || volume === null) return this.empty(input.index);

        if (this.previousClose === 0 || this.previousVolume === 0) {
            if (commit) {
                this.previousClose = close;
                this.previousVolume = volume;
            }
            return this.empty(input.index);
        }

        const priceDelta = close - this.previousClose;
        const volumeDelta = volume - this.previousVolume;
        if (priceDelta === 0 || volumeDelta === 0) {
            return {
                isFormed: this.previousValue !== null,
                values: [this.output('line', this.previousValue, input.index)],
            };
        }

        const logPriceDelta = Math.log(Math.abs(priceDelta));
        const logVolumeDelta = Math.log(Math.abs(volumeDelta));
        const divisor = logPriceDelta - logVolumeDelta;
        const raw = (divisor === 0 ? 0 : logPriceDelta * logVolumeDelta / divisor)
            * Math.sign(priceDelta);
        const value = commit
            ? this.average.push(raw)
            : this.average.preview(raw);
        if (commit) {
            this.previousClose = close;
            this.previousVolume = volume;
            if (value !== null) this.previousValue = value;
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.previousVolume = 0;
        this.previousValue = null;
        this.average.reset();
    }

    protected captureState(): DemandIndexCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            previousVolume: this.previousVolume,
            previousValue: this.previousValue,
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: DemandIndexCheckpoint): void {
        const values = state?.average?.values;
        const rebuilt = Array.isArray(values)
            ? values.reduce((sum, value) => sum + (value ?? 0), 0) / this.length
            : null;
        const tolerance = rebuilt === null
            ? 0
            : Math.max(1, Math.abs(rebuilt)) * Number.EPSILON * 128;
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null
            || finite(state.previousVolume) === null
            || (state.previousValue !== null && finite(state.previousValue) === null)
            || !Array.isArray(values) || values.length > this.length
            || values.some((value) => finite(value) === null)
            || ((values.length === this.length) !== (state.previousValue !== null))
            || (state.previousValue !== null
                && Math.abs(state.previousValue - rebuilt!) > tolerance)) {
            throw new TypeError('sschart: invalid Demand Index checkpoint');
        }
        this.average.restore(state.average);
        this.previousClose = state.previousClose;
        this.previousVolume = state.previousVolume;
        this.previousValue = state.previousValue;
    }

    private empty(index: number): IndicatorCalculationResult {
        return {
            isFormed: false,
            values: [this.output('line', null, index)],
        };
    }
}

export const DemandIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'DemandIndex',
    name: 'Demand Index',
    description: 'Price-and-volume demand pressure smoothed over recent valid movements.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'Demand Index', defaultStyle: lineStyle('#ab47bc') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['demandindex'],
    levels: [0],
    processorFactory: (parameters) => new DemandIndexProcessor(resolvedLength(parameters, 14)),
});
