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

export interface LaguerreRsiParameters extends IndicatorParameters {
    readonly gamma: number;
}

export interface LaguerreRsiCheckpoint {
    readonly l0: number;
    readonly l1: number;
    readonly l2: number;
    readonly l3: number;
    readonly previousUp: number;
    readonly previousDown: number;
    readonly formed: boolean;
}

export class LaguerreRsiProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    LaguerreRsiCheckpoint
> {
    private l0 = 0;
    private l1 = 0;
    private l2 = 0;
    private l3 = 0;
    private previousUp = 0;
    private previousDown = 0;
    private formed = false;

    constructor(readonly gamma: number) {
        super(['line']);
        parameter(gamma, gamma, 0.000001, 0.999999, 'gamma');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = finite(input.value?.close);
        if (price === null) {
            return {
                isFormed: this.formed,
                values: [this.output('line', null, input.index)],
            };
        }

        const complement = 1 - this.gamma;
        const l0 = complement * price + this.gamma * this.l0;
        const l1 = -this.gamma * l0 + this.l0 + this.gamma * this.l1;
        const l2 = -this.gamma * l1 + this.l1 + this.gamma * this.l2;
        const l3 = -this.gamma * l2 + this.l2 + this.gamma * this.l3;

        let up = 0;
        let down = 0;
        if (l0 >= l1) up += l0 - l1;
        else down += l1 - l0;
        if (l1 >= l2) up += l1 - l2;
        else down += l2 - l1;
        if (l2 >= l3) up += l2 - l3;
        else down += l3 - l2;

        const smoothedUp = complement * up + this.gamma * this.previousUp;
        const smoothedDown = complement * down + this.gamma * this.previousDown;
        const total = smoothedUp + smoothedDown;
        const value = total === 0 ? 50 : smoothedUp / total * 100;
        const formed = this.formed || commit;

        if (commit) {
            this.l0 = l0;
            this.l1 = l1;
            this.l2 = l2;
            this.l3 = l3;
            this.previousUp = smoothedUp;
            this.previousDown = smoothedDown;
            this.formed = true;
        }
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.l0 = 0;
        this.l1 = 0;
        this.l2 = 0;
        this.l3 = 0;
        this.previousUp = 0;
        this.previousDown = 0;
        this.formed = false;
    }

    protected captureState(): LaguerreRsiCheckpoint {
        return Object.freeze({
            l0: this.l0,
            l1: this.l1,
            l2: this.l2,
            l3: this.l3,
            previousUp: this.previousUp,
            previousDown: this.previousDown,
            formed: this.formed,
        });
    }

    protected restoreState(state: LaguerreRsiCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.l0) === null || finite(state.l1) === null
            || finite(state.l2) === null || finite(state.l3) === null
            || finite(state.previousUp) === null || state.previousUp < 0
            || finite(state.previousDown) === null || state.previousDown < 0
            || typeof state.formed !== 'boolean') {
            throw new TypeError('sschart: invalid Laguerre RSI checkpoint');
        }
        this.l0 = state.l0;
        this.l1 = state.l1;
        this.l2 = state.l2;
        this.l3 = state.l3;
        this.previousUp = state.previousUp;
        this.previousDown = state.previousDown;
        this.formed = state.formed;
    }
}

export const LaguerreRsiIndicator: IndicatorDefinition<
    IndicatorCandle,
    LaguerreRsiParameters
> = registerIndicator({
    id: 'LaguerreRSI',
    name: 'Laguerre RSI',
    description: 'RSI-style oscillator calculated from a four-stage Laguerre filter.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'gamma', name: 'Gamma', type: IndicatorParameterType.Number,
        defaultValue: 0.7, min: 0.000001, max: 0.999999, step: 0.001,
    }],
    outputs: [{
        id: 'line', name: 'Laguerre RSI',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#7e57c2',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,

    aliases: ['laguerrersi'],
    scaleRange: { min: 0, max: 100 },
    levels: [20, 80],
    processorFactory: (parameters) => new LaguerreRsiProcessor(
        parameter(parameters?.gamma, 0.7, 0.000001, 0.999999, 'gamma'),
    ),
});
