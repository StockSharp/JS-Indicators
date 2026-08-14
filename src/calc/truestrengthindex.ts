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
    PartialSeedExponentialMovingAverage,
    type PartialSeedExponentialMovingAverageCheckpoint,
} from '../math/index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export interface TrueStrengthIndexParameters extends IndicatorParameters {
    readonly firstLength: number;
    readonly secondLength: number;
    readonly signalLength: number;
}

export interface TrueStrengthIndexCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly firstMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly firstAbsoluteMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly doubleMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly doubleAbsoluteMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly signal: PartialSeedExponentialMovingAverageCheckpoint;
}

export class TrueStrengthIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    TrueStrengthIndexCheckpoint
> {
    private initialized = false;
    private previousClose: number | null = null;
    private readonly firstMomentum: PartialSeedExponentialMovingAverage;
    private readonly firstAbsoluteMomentum: PartialSeedExponentialMovingAverage;
    private readonly doubleMomentum: PartialSeedExponentialMovingAverage;
    private readonly doubleAbsoluteMomentum: PartialSeedExponentialMovingAverage;
    private readonly signal: PartialSeedExponentialMovingAverage;

    constructor(
        readonly firstLength: number,
        readonly secondLength: number,
        readonly signalLength: number,
    ) {
        super(['tsi', 'signal']);
        integer(firstLength, firstLength, 1, 500, 'firstLength');
        integer(secondLength, secondLength, 1, 500, 'secondLength');
        integer(signalLength, signalLength, 1, 500, 'signalLength');
        this.firstMomentum = new PartialSeedExponentialMovingAverage(firstLength);
        this.firstAbsoluteMomentum = new PartialSeedExponentialMovingAverage(firstLength);
        this.doubleMomentum = new PartialSeedExponentialMovingAverage(secondLength);
        this.doubleAbsoluteMomentum = new PartialSeedExponentialMovingAverage(secondLength);
        this.signal = new PartialSeedExponentialMovingAverage(signalLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const currentClose = finite(input.value?.close);
        if (!this.initialized) {
            if (commit) {
                this.initialized = true;
                this.previousClose = currentClose;
            }
            return {
                isFormed: false,
                values: [
                    this.output('tsi', null, input.index),
                    this.output('signal', null, input.index),
                ],
            };
        }

        const momentum = currentClose === null || this.previousClose === null
            ? null
            : currentClose - this.previousClose;
        const absoluteMomentum = momentum === null ? null : Math.abs(momentum);
        const firstMomentum = commit
            ? this.firstMomentum.push(momentum)
            : this.firstMomentum.preview(momentum);
        const firstAbsoluteMomentum = commit
            ? this.firstAbsoluteMomentum.push(absoluteMomentum)
            : this.firstAbsoluteMomentum.preview(absoluteMomentum);
        const doubleMomentum = commit
            ? this.doubleMomentum.push(firstMomentum)
            : this.doubleMomentum.preview(firstMomentum);
        const doubleAbsoluteMomentum = commit
            ? this.doubleAbsoluteMomentum.push(firstAbsoluteMomentum)
            : this.doubleAbsoluteMomentum.preview(firstAbsoluteMomentum);

        const rawTsi = doubleMomentum === null || doubleAbsoluteMomentum === null
            ? null
            : doubleAbsoluteMomentum === 0
                ? 0
                : finite(100 * doubleMomentum / doubleAbsoluteMomentum);
        const tsiFormed = this.doubleMomentum.isFormed
            && this.doubleAbsoluteMomentum.isFormed;
        const tsi = tsiFormed ? rawTsi : null;
        const rawSignal = !tsiFormed || tsi === null
            ? null
            : commit ? this.signal.push(tsi) : this.signal.preview(tsi);
        const signal = this.signal.isFormed ? rawSignal : null;
        if (commit) this.previousClose = currentClose;
        return {
            isFormed: this.signal.isFormed,
            values: [
                this.formedOutput('tsi', tsi, tsiFormed, input.index),
                this.formedOutput('signal', signal, this.signal.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.initialized = false;
        this.previousClose = null;
        this.firstMomentum.reset();
        this.firstAbsoluteMomentum.reset();
        this.doubleMomentum.reset();
        this.doubleAbsoluteMomentum.reset();
        this.signal.reset();
    }

    protected captureState(): TrueStrengthIndexCheckpoint {
        return Object.freeze({
            initialized: this.initialized,
            previousClose: this.previousClose,
            firstMomentum: this.firstMomentum.checkpoint(),
            firstAbsoluteMomentum: this.firstAbsoluteMomentum.checkpoint(),
            doubleMomentum: this.doubleMomentum.checkpoint(),
            doubleAbsoluteMomentum: this.doubleAbsoluteMomentum.checkpoint(),
            signal: this.signal.checkpoint(),
        });
    }

    protected restoreState(state: TrueStrengthIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.initialized !== 'boolean'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || (!state.initialized && state.previousClose !== null)
            || state.firstMomentum?.seed?.values?.length
                !== state.firstAbsoluteMomentum?.seed?.values?.length
            || state.doubleMomentum?.seed?.values?.length
                !== state.doubleAbsoluteMomentum?.seed?.values?.length) {
            throw new TypeError('sschart: invalid True Strength Index checkpoint');
        }
        this.firstMomentum.restore(state.firstMomentum);
        this.firstAbsoluteMomentum.restore(state.firstAbsoluteMomentum);
        this.doubleMomentum.restore(state.doubleMomentum);
        this.doubleAbsoluteMomentum.restore(state.doubleAbsoluteMomentum);
        this.signal.restore(state.signal);
        this.initialized = state.initialized;
        this.previousClose = state.previousClose;
    }
}

export const TrueStrengthIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    TrueStrengthIndexParameters
> = registerIndicator({
    id: 'TrueStrengthIndex',
    name: 'True Strength Index',
    description: 'Double-smoothed momentum oscillator with an EMA signal line.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'firstLength', name: 'First Length', type: IndicatorParameterType.Integer,
            defaultValue: 25, min: 1, max: 500, step: 1,
        },
        {
            id: 'secondLength', name: 'Second Length', type: IndicatorParameterType.Integer,
            defaultValue: 13, min: 1, max: 500, step: 1,
        },
        {
            id: 'signalLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 7, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [
        { id: 'tsi', name: 'TSI', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'signal', name: 'Signal', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['tsi', 'truestrengthindex'],
    scaleRange: { min: -100, max: 100 },
    levels: [-25, 0, 25],
    processorFactory: (parameters) => new TrueStrengthIndexProcessor(
        integer(parameters?.firstLength, 25, 1, 500, 'firstLength'),
        integer(parameters?.secondLength, 13, 1, 500, 'secondLength'),
        integer(parameters?.signalLength, 7, 1, 500, 'signalLength'),
    ),
});
