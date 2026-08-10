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
    RollingSum,
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

export interface ChandeMomentumOscillatorCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}

export class ChandeMomentumOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ChandeMomentumOscillatorCheckpoint
> {
    private initialized = false;
    private previousClose: number | null = null;
    private readonly up: RollingSum;
    private readonly down: RollingSum;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: CMO length must be a positive integer');
        this.up = new RollingSum(length);
        this.down = new RollingSum(length);
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

        const delta = close === null || this.previousClose === null
            ? null
            : finite(close - this.previousClose);
        const up = delta === null ? null : Math.max(delta, 0);
        const down = delta === null ? null : Math.max(-delta, 0);
        const upSum = commit ? this.up.push(up) : this.up.preview(up);
        const downSum = commit ? this.down.push(down) : this.down.preview(down);
        if (commit) this.previousClose = close;

        let value: number | null = null;
        if (upSum !== null && downSum !== null) {
            const total = upSum + downSum;
            value = total === 0 ? 0 : finite(100 * (upSum - downSum) / total);
        }
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.previousClose = null;
        this.up.reset();
        this.down.reset();
    }

    protected captureState(): ChandeMomentumOscillatorCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previousClose: this.previousClose,
            up: this.up.checkpoint(),
            down: this.down.checkpoint(),
        });
    }

    protected restoreState(state: ChandeMomentumOscillatorCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || state.up?.values?.length !== state.down?.values?.length
            || (!state.initialized && (state.previousClose !== null || state.up.values.length !== 0))) {
            throw new TypeError('sschart: invalid Chande Momentum Oscillator checkpoint');
        }
        this.up.restore(state.up);
        this.down.restore(state.down);
        this.initialized = state.initialized;
        this.previousClose = state.previousClose;
    }
}

export const ChandeMomentumOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'ChandeMomentumOscillator',
    name: 'Chande Momentum Oscillator',
    description: 'Signed balance of rolling upward and downward close changes.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(15)],
    outputs: [{ id: 'line', name: 'CMO', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['cmo'],
    scaleRange: { min: -100, max: 100 },
    levels: [-50, 0, 50],
    processorFactory: (parameters) => new ChandeMomentumOscillatorProcessor(
        resolvedLength(parameters, 15),
    ),
});
