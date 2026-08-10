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
    ExponentialMovingAverage,
    type SeededMovingAverageCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface ForceIndexCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly average: SeededMovingAverageCheckpoint;
}

export class ForceIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ForceIndexCheckpoint
> {
    private initialized = false;
    private previousClose: number | null = null;
    private readonly average: ExponentialMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500)
            throw new RangeError('sschart: Force Index length must be an integer from 1 to 500');
        this.average = new ExponentialMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (!this.initialized) {
            if (commit) {
                this.initialized = true;
                this.previousClose = close;
            }
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const volume = finite(input.value?.volume);
        const force = close === null || this.previousClose === null || volume === null
            ? null
            : finite((close - this.previousClose) * volume);
        const value = force === null
            ? null
            : (commit ? this.average.push(force) : this.average.preview(force));
        if (commit) this.previousClose = close;
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.previousClose = null;
        this.average.reset();
    }

    protected captureState(): ForceIndexCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previousClose: this.previousClose,
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: ForceIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || (!state.initialized && state.previousClose !== null)) {
            throw new TypeError('sschart: invalid Force Index checkpoint');
        }
        this.average.restore(state.average);
        this.initialized = state.initialized;
        this.previousClose = state.previousClose;
    }
}

export const ForceIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'ForceIndex',
    name: 'Force Index',
    description: 'Exponential average of close-to-close change multiplied by volume.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(13)],
    outputs: [{ id: 'line', name: 'Force Index', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['forceindex', 'elderforceindex', 'ElderForceIndex'],
    levels: [0],
    processorFactory: (parameters) => new ForceIndexProcessor(
        resolvedLength(parameters, 13),
    ),
});
