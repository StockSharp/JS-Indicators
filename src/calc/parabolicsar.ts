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
    parameter,
} from './shared/adaptive.js';
import {
    finite,
} from './shared/guards.js';

export interface ParabolicSarParameters extends IndicatorParameters {
    readonly acceleration: number;
    readonly accelerationStep: number;
    readonly accelerationMax: number;
}

export interface ParabolicSarCandleState {
    readonly high: number;
    readonly low: number;
}

export interface ParabolicSarCheckpoint {
    readonly validCandles: number;
    readonly tail: readonly ParabolicSarCandleState[];
    readonly longPosition: boolean;
    readonly extremePoint: number;
    readonly accelerationFactor: number;
    readonly previousBar: number;
    readonly accelerationIncreased: boolean;
    readonly reverseBar: number;
    readonly reverseValue: number;
    readonly previousSar: number;
    readonly todaySar: number;
    readonly lastReturned: number;
}

export interface MutableParabolicSarState {
    validCandles: number;
    tail: ParabolicSarCandleState[];
    longPosition: boolean;
    extremePoint: number;
    accelerationFactor: number;
    previousBar: number;
    accelerationIncreased: boolean;
    reverseBar: number;
    reverseValue: number;
    previousSar: number;
    todaySar: number;
    lastReturned: number;
}

export function initialState(): MutableParabolicSarState {
    return {
        validCandles: 0,
        tail: [],
        longPosition: false,
        extremePoint: 0,
        accelerationFactor: 0,
        previousBar: 0,
        accelerationIncreased: false,
        reverseBar: 0,
        reverseValue: 0,
        previousSar: 0,
        todaySar: 0,
        lastReturned: 0,
    };
}

export class ParabolicSarProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ParabolicSarCheckpoint
> {
    private state = initialState();

    constructor(
        readonly acceleration: number,
        readonly accelerationStep: number,
        readonly accelerationMax: number,
    ) {
        super(['value']);
        parameter(acceleration, acceleration, 0.0001, 10, 'acceleration');
        parameter(accelerationStep, accelerationStep, 0.0001, 10, 'accelerationStep');
        parameter(accelerationMax, accelerationMax, 0.0001, 10, 'accelerationMax');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        if (high === null || low === null) {
            return {
                isFormed: false,
                values: [this.output('value', null, input.index)],
            };
        }
        const result = this.evaluate({ high, low });
        if (commit) this.state = result.state;
        return {
            isFormed: result.value !== null,
            values: [this.output('value', result.value, input.index)],
        };
    }

    protected resetState(): void { this.state = initialState(); }

    protected captureState(): ParabolicSarCheckpoint {
        return Object.freeze({
            ...this.state,
            tail: Object.freeze(this.state.tail.map((candle) => Object.freeze({ ...candle }))),
        });
    }

    protected restoreState(state: ParabolicSarCheckpoint): void {
        const numeric = [
            state?.extremePoint,
            state?.accelerationFactor,
            state?.reverseValue,
            state?.previousSar,
            state?.todaySar,
            state?.lastReturned,
        ];
        if (state === null || typeof state !== 'object'
            || !Number.isInteger(state.validCandles) || state.validCandles < 0
            || !Array.isArray(state.tail) || state.tail.length > 3
            || state.tail.length !== Math.min(3, state.validCandles)
            || state.tail.some((candle) => candle === null || typeof candle !== 'object'
                || finite(candle.high) === null || finite(candle.low) === null)
            || typeof state.longPosition !== 'boolean'
            || typeof state.accelerationIncreased !== 'boolean'
            || !Number.isInteger(state.previousBar) || state.previousBar < 0
            || !Number.isInteger(state.reverseBar) || state.reverseBar < 0
            || numeric.some((value) => finite(value) === null)) {
            throw new TypeError('sschart: invalid Parabolic SAR checkpoint');
        }
        this.state = {
            ...state,
            tail: state.tail.map((candle) => ({ ...candle })),
        };
    }

    private evaluate(candle: ParabolicSarCandleState): {
        readonly state: MutableParabolicSarState;
        readonly value: number | null;
    } {
        const state: MutableParabolicSarState = {
            ...this.state,
            tail: this.state.tail.map((item) => ({ ...item })),
        };
        const append = (value: ParabolicSarCandleState) => {
            state.validCandles += 1;
            state.tail.push({ ...value });
            if (state.tail.length > 3) state.tail.shift();
        };
        if (state.validCandles === 0) append(candle);
        append(candle);

        const current = () => state.tail[state.tail.length - 1];
        const previous = () => state.tail[state.tail.length - 2];
        const reverse = (): number => {
            let result = state.extremePoint;
            const latest = current();
            const shouldFlip = (state.longPosition && state.previousSar > latest.low)
                || (!state.longPosition && state.previousSar < latest.high)
                || state.previousBar !== state.validCandles;
            if (shouldFlip) {
                state.longPosition = !state.longPosition;
                state.reverseBar = state.validCandles;
                state.reverseValue = state.extremePoint;
                state.accelerationFactor = this.acceleration;
                state.extremePoint = state.longPosition ? latest.high : latest.low;
                state.previousSar = result;
            } else result = state.previousSar;
            return result;
        };
        const today = (candidate: number): number => {
            const latest = current();
            const prior = previous();
            if (state.longPosition) {
                const lowest = Math.min(candidate, latest.low, prior.low);
                return latest.low > lowest ? lowest : reverse();
            }
            const highest = Math.max(candidate, latest.high, prior.high);
            return latest.high < highest ? highest : reverse();
        };
        const increaseAcceleration = () => {
            if (state.accelerationIncreased) return;
            state.accelerationFactor = Math.min(
                this.accelerationMax,
                state.accelerationFactor + this.accelerationStep,
            );
            state.accelerationIncreased = true;
        };

        if (state.validCandles < 3) return { state, value: null };
        if (state.validCandles === 3) {
            const latest = current();
            const prior = previous();
            state.longPosition = latest.high > prior.high;
            let maximum = -Infinity;
            let minimum = Infinity;
            for (const item of state.tail) {
                maximum = Math.max(maximum, item.high);
                minimum = Math.min(minimum, item.low);
            }
            state.extremePoint = state.longPosition ? maximum : minimum;
            state.accelerationFactor = this.acceleration;
            const value = state.extremePoint
                + (state.longPosition ? -1 : 1)
                    * (maximum - minimum) * state.accelerationFactor;
            state.lastReturned = value;
            return { state, value };
        }

        if (state.accelerationIncreased && state.previousBar !== state.validCandles)
            state.accelerationIncreased = false;
        let value = state.lastReturned;
        if (state.reverseBar !== state.validCandles) {
            state.todaySar = today(
                state.lastReturned + state.accelerationFactor
                    * (state.extremePoint - state.lastReturned),
            );
            for (let offset = 1; offset <= 2; offset += 1) {
                const prior = state.tail[state.tail.length - 1 - offset];
                if (state.longPosition) {
                    if (state.todaySar > prior.low) state.todaySar = prior.low;
                } else if (state.todaySar < prior.high) state.todaySar = prior.high;
            }
            const latest = current();
            const prior = previous();
            const crossed = (state.longPosition
                && (latest.low < state.todaySar || prior.low < state.todaySar))
                || (!state.longPosition
                    && (latest.high > state.todaySar || prior.high > state.todaySar));
            if (crossed) {
                value = reverse();
                state.lastReturned = value;
                state.previousBar = state.validCandles;
                return { state, value };
            }

            if (state.longPosition) {
                if (state.previousBar !== state.validCandles || latest.low < state.previousSar) {
                    value = state.todaySar;
                    state.previousSar = state.todaySar;
                } else value = state.previousSar;
                if (latest.high > state.extremePoint) {
                    state.extremePoint = latest.high;
                    increaseAcceleration();
                }
            } else {
                if (state.previousBar !== state.validCandles || latest.high > state.previousSar) {
                    value = state.todaySar;
                    state.previousSar = state.todaySar;
                } else value = state.previousSar;
                if (latest.low < state.extremePoint) {
                    state.extremePoint = latest.low;
                    increaseAcceleration();
                }
            }
        } else {
            const latest = current();
            if (state.longPosition && latest.high > state.extremePoint)
                state.extremePoint = latest.high;
            else if (!state.longPosition && latest.low < state.extremePoint)
                state.extremePoint = latest.low;
            value = state.previousSar;
            state.todaySar = today(state.longPosition
                ? Math.min(state.reverseValue, latest.low)
                : Math.max(state.reverseValue, latest.high));
        }
        state.previousBar = state.validCandles;
        state.lastReturned = value;
        return { state, value };
    }
}

export const ParabolicSarIndicator: IndicatorDefinition<
    IndicatorCandle,
    ParabolicSarParameters
> = registerIndicator({
    id: 'ParabolicSar',
    name: 'Parabolic SAR',
    description: 'Wilder trend-following stop-and-reverse points.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'acceleration', name: 'Acceleration', type: IndicatorParameterType.Number,
            defaultValue: 0.02, min: 0.0001, max: 10, step: 0.001,
        },
        {
            id: 'accelerationStep', name: 'Acceleration Step',
            type: IndicatorParameterType.Number,
            defaultValue: 0.02, min: 0.0001, max: 10, step: 0.001,
        },
        {
            id: 'accelerationMax', name: 'Acceleration Max',
            type: IndicatorParameterType.Number,
            defaultValue: 0.2, min: 0.0001, max: 10, step: 0.01,
        },
    ],
    outputs: [{
        id: 'value',
        name: 'SAR',
        defaultStyle: {
            series: IndicatorSeriesStyle.Markers,
            color: '#ffca28',
            options: { pointMarkersRadius: 3 },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['psar', 'parabolicsar'],
    painter: 'dots',
    processorFactory: (parameters) => new ParabolicSarProcessor(
        parameter(parameters?.acceleration, 0.02, 0.0001, 10, 'acceleration'),
        parameter(parameters?.accelerationStep, 0.02, 0.0001, 10, 'accelerationStep'),
        parameter(parameters?.accelerationMax, 0.2, 0.0001, 10, 'accelerationMax'),
    ),
});
