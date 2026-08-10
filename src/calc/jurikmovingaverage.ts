import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
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
    LENGTH_STYLE,
    close,
    resolvedInteger,
    resolvedLength,
} from './shared/core.js';

export interface JurikMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly phase: number;
}

export interface JurikMovingAverageCheckpoint {
    readonly formed: boolean;
    readonly previousMa1: number;
    readonly previousMa2: number;
}

export class JurikMovingAverageProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    JurikMovingAverageCheckpoint
> {
    private formed = false;
    private previousMa1 = 0;
    private previousMa2 = 0;
    private readonly beta: number;
    private readonly phaseRatio: number;

    constructor(readonly length: number, readonly phase: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1 || length > 500) {
            throw new RangeError(
                'sschart: Jurik Moving Average length must be an integer from 1 to 500',
            );
        }
        if (!Number.isInteger(phase) || phase < -100 || phase > 100) {
            throw new RangeError(
                'sschart: Jurik Moving Average phase must be an integer from -100 to 100',
            );
        }
        this.beta = 0.45 * (length - 1) / (0.45 * (length - 1) + 2);
        this.phaseRatio = (phase + 100) / 200;
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const price = close(input);
        if (price === null) {
            return {
                isFormed: this.formed,
                values: [this.output('line', null, input.index)],
            };
        }

        if (!this.formed) {
            const becomesFormed = input.index + 1 >= this.length;
            if (commit) {
                this.previousMa1 = price;
                this.previousMa2 = price;
                this.formed = becomesFormed;
            }
            return {
                isFormed: becomesFormed,
                values: [this.output('line', becomesFormed ? price : null, input.index)],
            };
        }

        const ma1 = this.previousMa1 + this.beta * (price - this.previousMa1);
        const ma2 = this.previousMa2 + this.beta * (ma1 - this.previousMa2);
        const value = ma2 + this.phaseRatio * (ma2 - this.previousMa2);
        if (commit) {
            this.previousMa1 = ma1;
            this.previousMa2 = ma2;
        }
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.formed = false;
        this.previousMa1 = 0;
        this.previousMa2 = 0;
    }

    protected captureState(): JurikMovingAverageCheckpoint {
        return Object.freeze({
            formed: this.formed,
            previousMa1: this.previousMa1,
            previousMa2: this.previousMa2,
        });
    }

    protected restoreState(state: JurikMovingAverageCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || typeof state.formed !== 'boolean'
            || typeof state.previousMa1 !== 'number' || !Number.isFinite(state.previousMa1)
            || typeof state.previousMa2 !== 'number' || !Number.isFinite(state.previousMa2)) {
            throw new TypeError('sschart: invalid Jurik Moving Average checkpoint');
        }
        this.formed = state.formed;
        this.previousMa1 = state.previousMa1;
        this.previousMa2 = state.previousMa2;
    }
}

export const JurikMovingAverageIndicator: IndicatorDefinition<
    IndicatorCandle,
    JurikMovingAverageParameters
> = registerIndicator({
    id: 'JurikMovingAverage',
    name: 'Jurik Moving Average',
    description: 'Low-lag two-stage Jurik-style smoothing with configurable phase response.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 20, min: 1, max: 500, step: 1,
        },
        {
            id: 'phase', name: 'Phase', type: IndicatorParameterType.Integer,
            defaultValue: 0, min: -100, max: 100, step: 1,
        },
    ],
    outputs: [{
        id: 'line',
        name: 'JMA',
        defaultStyle: { ...LENGTH_STYLE, color: '#ab47bc' },
    }],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,

    aliases: ['jma'],
    processorFactory: (parameters) => new JurikMovingAverageProcessor(
        resolvedLength(parameters, 20, 1),
        resolvedInteger(parameters?.phase, 0, -100, 100, 'phase'),
    ),
});
