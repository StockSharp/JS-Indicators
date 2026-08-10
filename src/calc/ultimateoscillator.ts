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
    RollingSum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface UltimateOscillatorCheckpoint {
    readonly previousClose: number | null;
    readonly buyingPressure: readonly RollingWindowCheckpoint[];
    readonly trueRange: readonly RollingWindowCheckpoint[];
}

export const ULTIMATE_OSCILLATOR_PERIODS = Object.freeze([7, 14, 28]);

export const ULTIMATE_OSCILLATOR_WEIGHTS = Object.freeze([4, 2, 1]);

export class UltimateOscillatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    UltimateOscillatorCheckpoint
> {
    private previousClose: number | null = null;
    private readonly buyingPressure = ULTIMATE_OSCILLATOR_PERIODS.map(
        (period) => new RollingSum(period),
    );
    private readonly trueRange = ULTIMATE_OSCILLATOR_PERIODS.map(
        (period) => new RollingSum(period),
    );

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const valid = high !== null && low !== null && close !== null;
        const minimum = valid && this.previousClose !== null
            ? Math.min(low, this.previousClose)
            : null;
        const maximum = valid && this.previousClose !== null
            ? Math.max(high, this.previousClose)
            : null;
        const buyingPressure = minimum === null ? null : close! - minimum;
        const trueRange = minimum === null || maximum === null ? null : maximum - minimum;
        const buyingPressureSums = this.buyingPressure.map((sum) => (
            commit ? sum.push(buyingPressure) : sum.preview(buyingPressure)
        ));
        const trueRangeSums = this.trueRange.map((sum) => (
            commit ? sum.push(trueRange) : sum.preview(trueRange)
        ));
        if (commit && valid) this.previousClose = close;

        const formed = buyingPressureSums.every((value) => value !== null)
            && trueRangeSums.every((value) => value !== null);
        let value: number | null = null;
        if (formed && trueRangeSums.every((sum) => sum !== 0)) {
            const weighted = ULTIMATE_OSCILLATOR_WEIGHTS.reduce((total, weight, index) => (
                total + weight * buyingPressureSums[index]! / trueRangeSums[index]!
            ), 0);
            value = finite(100 * weighted / 7);
        }
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = null;
        this.buyingPressure.forEach((sum) => sum.reset());
        this.trueRange.forEach((sum) => sum.reset());
    }

    protected captureState(): UltimateOscillatorCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            buyingPressure: Object.freeze(this.buyingPressure.map((sum) => sum.checkpoint())),
            trueRange: Object.freeze(this.trueRange.map((sum) => sum.checkpoint())),
        });
    }

    protected restoreState(state: UltimateOscillatorCheckpoint): void {
        const validWindows = (windows: readonly RollingWindowCheckpoint[]) => (
            Array.isArray(windows)
            && windows.length === ULTIMATE_OSCILLATOR_PERIODS.length
            && windows.every((window, index) => (
                window !== null
                && typeof window === 'object'
                && Array.isArray(window.values)
                && window.values.length <= ULTIMATE_OSCILLATOR_PERIODS[index]
                && window.values.every((value: number | null) => (
                    value === null || finite(value) !== null
                ))
            ))
        );
        if (state === null || typeof state !== 'object'
            || (state.previousClose !== null && finite(state.previousClose) === null)
            || !validWindows(state.buyingPressure) || !validWindows(state.trueRange)
            || state.buyingPressure.some((window, index) => (
                window.values.length !== state.trueRange[index].values.length
            ))) {
            throw new TypeError('sschart: invalid Ultimate Oscillator checkpoint');
        }
        this.buyingPressure.forEach((sum, index) => sum.restore(state.buyingPressure[index]));
        this.trueRange.forEach((sum, index) => sum.restore(state.trueRange[index]));
        this.previousClose = state.previousClose;
    }
}

export const UltimateOscillatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'UltimateOscillator',
    name: 'Ultimate Oscillator',
    description: 'Weighted buying-pressure oscillator over fixed 7, 14 and 28 bar windows.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'Ultimate Oscillator', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['uo', 'ultimateoscillator'],
    scaleRange: { min: 0, max: 100 },
    levels: [30, 70],
    processorFactory: () => new UltimateOscillatorProcessor(),
});
