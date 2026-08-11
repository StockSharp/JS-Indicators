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
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
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

export interface WilliamsRCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}

export class WilliamsRProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    WilliamsRCheckpoint
> {
    private readonly high: RollingMaximum;
    private readonly low: RollingMinimum;

    constructor(readonly length: number) {
        super(['line']);
        this.high = new RollingMaximum(length);
        this.low = new RollingMinimum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const incomingHigh = finite(input.value?.high);
        const incomingLow = finite(input.value?.low);
        const currentHigh = this.high.partialValue;
        const currentLow = this.low.partialValue;
        const high = commit
            ? this.high.push(incomingHigh)
            : incomingHigh === null
                ? null
                : currentHigh === null ? incomingHigh : Math.max(currentHigh, incomingHigh);
        const low = commit
            ? this.low.push(incomingLow)
            : incomingLow === null
                ? null
                : currentLow === null ? incomingLow : Math.min(currentLow, incomingLow);
        const close = finite(input.value?.close);
        let value: number | null = null;
        if (high !== null && low !== null && close !== null) {
            const range = high - low;
            // A zero-width range has no defined %R; the platform emits nothing, and so must this
            // or the incremental path would disagree with the batch one on flat data.
            if (range !== 0) value = -100 * (high - close) / range;
        }
        return {
            isFormed: this.low.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.high.reset();
        this.low.reset();
    }
    protected captureState(): WilliamsRCheckpoint {
        return Object.freeze({
            high: this.high.checkpoint(),
            low: this.low.checkpoint(),
        });
    }
    protected restoreState(state: WilliamsRCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.high?.values?.length !== state.low?.values?.length) {
            throw new TypeError('sschart: invalid Williams R checkpoint');
        }
        this.high.restore(state.high);
        this.low.restore(state.low);
    }
}

export const WilliamsRIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'WilliamsR',
    name: 'Williams R',
    description: 'Close position within the recent high-low range, scaled from -100 to 0.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(5)],
    outputs: [{ id: 'line', name: 'Williams R', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['williamsr'],
    scaleRange: { min: -100, max: 0 },
    levels: [-80, -20],
    processorFactory: (parameters) => new WilliamsRProcessor(resolvedLength(parameters, 14)),
});
