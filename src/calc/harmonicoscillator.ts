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
    RingBuffer,
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    CycleLengthParameters,
} from './shared/cycle.js';
import {
    finite,
    length,
} from './shared/guards.js';

export interface HarmonicOscillatorCheckpoint {
    readonly values: RingBufferCheckpoint<number | null>;
}

export interface HarmonicEvaluation {
    readonly size: number;
    readonly sine: number;
    readonly cosine: number;
    readonly invalid: number;
}

export class HarmonicOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    HarmonicOscillatorCheckpoint
> {
    private readonly values: RingBuffer<number | null>;
    private readonly sineStep: number;
    private readonly cosineStep: number;
    private sine = 0;
    private cosine = 0;
    private invalid = 0;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Harmonic Oscillator length must be an integer from 1 to 500',
            );
        }
        this.values = new RingBuffer<number | null>(length);
        const angle = 2 * Math.PI / length;
        this.sineStep = Math.sin(angle);
        this.cosineStep = Math.cos(angle);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const incoming = finite(input.value?.close);
        const evaluation = this.evaluate(incoming);
        if (commit) {
            this.values.push(incoming);
            this.sine = evaluation.sine;
            this.cosine = evaluation.cosine;
            this.invalid = evaluation.invalid;
        }
        const candidate = evaluation.size === this.length && evaluation.invalid === 0
            ? evaluation.sine / this.length
            : null;
        const value = finite(candidate);
        return {
            isFormed: this.values.full && this.invalid === 0,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.values.clear();
        this.sine = 0;
        this.cosine = 0;
        this.invalid = 0;
    }

    protected captureState(): HarmonicOscillatorCheckpoint {
        return Object.freeze({ values: this.values.checkpoint() });
    }

    protected restoreState(state: HarmonicOscillatorCheckpoint): void {
        const values = state?.values?.values;
        if (!Array.isArray(values) || values.length > this.length
            || values.some((value) => value !== null && finite(value) === null)) {
            throw new TypeError('sschart: invalid Harmonic Oscillator checkpoint');
        }
        this.resetState();
        for (const value of values) this.append(value);
    }

    private evaluate(incoming: number | null): HarmonicEvaluation {
        const outgoing = this.values.full ? (this.values.front() ?? null) : null;
        const size = Math.min(this.length, this.values.size + 1);
        const invalid = this.invalid
            - (this.values.full && outgoing === null ? 1 : 0)
            + (incoming === null ? 1 : 0);
        if (this.length === 1) {
            return { size, sine: 0, cosine: incoming ?? 0, invalid };
        }
        const sine = this.sine * this.cosineStep + this.cosine * this.sineStep;
        const cosine = this.cosine * this.cosineStep - this.sine * this.sineStep
            - (this.values.full ? (outgoing ?? 0) : 0)
            + (incoming ?? 0);
        return { size, sine, cosine, invalid };
    }

    private append(value: number | null): void {
        const evaluation = this.evaluate(value);
        this.values.push(value);
        this.sine = evaluation.sine;
        this.cosine = evaluation.cosine;
        this.invalid = evaluation.invalid;
    }
}

export const HarmonicOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    CycleLengthParameters
> = registerIndicator({
    id: 'HarmonicOscillator',
    name: 'Harmonic Oscillator',
    description: 'Sine-weighted average of closing prices over a fixed cycle.',
    category: IndicatorCategory.Cycle,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 14, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line',
        name: 'Harmonic Oscillator',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#ab47bc',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['harmonic', 'harmonicoscillator'],
    levels: [0],
    processorFactory: (parameters) => new HarmonicOscillatorProcessor(
        length(parameters?.length, 14),
    ),
});
