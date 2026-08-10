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

export interface AdaptiveLaguerreFilterParameters extends IndicatorParameters {
    readonly gamma: number;
}

export interface AdaptiveLaguerreFilterCheckpoint {
    readonly l0: number;
    readonly l1: number;
    readonly l2: number;
    readonly l3: number;
    readonly formed: boolean;
}

export class AdaptiveLaguerreFilterProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AdaptiveLaguerreFilterCheckpoint
> {
    private l0 = 0;
    private l1 = 0;
    private l2 = 0;
    private l3 = 0;
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
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const complement = 1 - this.gamma;
        const l0 = complement * price + this.gamma * this.l0;
        const l1 = complement * l0 + this.gamma * this.l1;
        const l2 = complement * l1 + this.gamma * this.l2;
        const l3 = complement * l2 + this.gamma * this.l3;
        const value = (l0 + 2 * l1 + 2 * l2 + l3) / 6;
        const formed = this.formed || value >= price;

        if (commit) {
            this.l0 = l0;
            this.l1 = l1;
            this.l2 = l2;
            this.l3 = l3;
            this.formed = formed;
        }
        return {
            isFormed: formed,
            values: [this.output('line', formed ? value : null, input.index)],
        };
    }

    protected resetState(): void {
        this.l0 = 0;
        this.l1 = 0;
        this.l2 = 0;
        this.l3 = 0;
        this.formed = false;
    }

    protected captureState(): AdaptiveLaguerreFilterCheckpoint {
        return Object.freeze({
            l0: this.l0,
            l1: this.l1,
            l2: this.l2,
            l3: this.l3,
            formed: this.formed,
        });
    }

    protected restoreState(state: AdaptiveLaguerreFilterCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.l0) === null || finite(state.l1) === null
            || finite(state.l2) === null || finite(state.l3) === null
            || typeof state.formed !== 'boolean') {
            throw new TypeError('sschart: invalid Adaptive Laguerre Filter checkpoint');
        }
        this.l0 = state.l0;
        this.l1 = state.l1;
        this.l2 = state.l2;
        this.l3 = state.l3;
        this.formed = state.formed;
    }
}

export const AdaptiveLaguerreFilterIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptiveLaguerreFilterParameters
> = registerIndicator({
    id: 'AdaptiveLaguerreFilter',
    name: 'Adaptive Laguerre Filter',
    description: 'Four-stage recursive Laguerre low-pass filter controlled by gamma.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'gamma', name: 'Gamma', type: IndicatorParameterType.Number,
        defaultValue: 0.8, min: 0.000001, max: 0.999999, step: 0.001,
    }],
    outputs: [{
        id: 'line', name: 'ALF',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#29b6f6',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['alf'],
    processorFactory: (parameters) => new AdaptiveLaguerreFilterProcessor(
        parameter(parameters?.gamma, 0.8, 0.000001, 0.999999, 'gamma'),
    ),
});
