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
    type SequentialIndicatorCheckpoint,
} from '../sequential-processor.js';
import {
    RollingMaximum,
    RollingMinimum,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    RelativeStrengthIndexCheckpoint,
    RelativeStrengthIndexProcessor,
    lengthParameter,
    lineStyle,
    resolvedLength,
    resolvedPeriod,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export function resolvedFinite(value: unknown, fallback: number, name: string): number {
    const resolved = value ?? fallback;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved))
        throw new TypeError(`sschart: ${name} must be finite`);
    return resolved;
}

export interface DynamicZonesRsiParameters extends IndicatorParameters {
    readonly length: number;
    readonly oversoldLevel: number;
    readonly overboughtLevel: number;
}

export interface DynamicZonesRsiCheckpoint {
    readonly rsi: SequentialIndicatorCheckpoint<RelativeStrengthIndexCheckpoint>;
    readonly minimum: RollingWindowCheckpoint;
    readonly maximum: RollingWindowCheckpoint;
}

export class DynamicZonesRsiProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DynamicZonesRsiCheckpoint
> {
    private readonly rsi: RelativeStrengthIndexProcessor;
    private readonly minimum: RollingMinimum;
    private readonly maximum: RollingMaximum;

    constructor(
        readonly length: number,
        readonly oversoldLevel: number,
        readonly overboughtLevel: number,
    ) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        if (finite(oversoldLevel) === null || finite(overboughtLevel) === null) {
            throw new TypeError('sschart: Dynamic Zones RSI levels must be finite');
        }
        this.rsi = new RelativeStrengthIndexProcessor(length);
        this.minimum = new RollingMinimum(length);
        this.maximum = new RollingMaximum(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const rsi = this.rsi.process(input).values[0]?.value ?? null;
        if (rsi === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const minimum = commit ? this.minimum.push(rsi) : this.minimum.preview(rsi);
        const maximum = commit ? this.maximum.push(rsi) : this.maximum.preview(rsi);
        if (minimum === null || maximum === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const range = maximum - minimum;
        const dynamicOversold = minimum + range * this.oversoldLevel / 100;
        const dynamicOverbought = minimum + range * this.overboughtLevel / 100;
        const value = rsi <= dynamicOversold
            ? 0
            : rsi >= dynamicOverbought
                ? 100
                : (rsi - dynamicOversold) / (dynamicOverbought - dynamicOversold) * 100;
        return {
            isFormed: true,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.rsi.reset();
        this.minimum.reset();
        this.maximum.reset();
    }

    protected captureState(): DynamicZonesRsiCheckpoint {
        return Object.freeze({
            rsi: this.rsi.checkpoint(),
            minimum: this.minimum.checkpoint(),
            maximum: this.maximum.checkpoint(),
        });
    }

    protected restoreState(state: DynamicZonesRsiCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.minimum?.values?.length !== state.maximum?.values?.length
            || state.minimum?.values?.length > this.length) {
            throw new TypeError('sschart: invalid Dynamic Zones RSI checkpoint');
        }
        this.rsi.restore(state.rsi);
        this.minimum.restore(state.minimum);
        this.maximum.restore(state.maximum);
    }
}

export const DynamicZonesRsiIndicator: IndicatorDefinition<
    IndicatorCandle,
    DynamicZonesRsiParameters
> = registerIndicator({
    id: 'DynamicZonesRSI',
    name: 'Dynamic Zones RSI',
    description: 'RSI remapped between percentile zones of its own recent range.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        lengthParameter(14),
        {
            id: 'oversoldLevel', name: 'Oversold Level',
            type: IndicatorParameterType.Number, defaultValue: 20,
            min: 0, max: 100, step: 1,
        },
        {
            id: 'overboughtLevel', name: 'Overbought Level',
            type: IndicatorParameterType.Number, defaultValue: 80,
            min: 0, max: 100, step: 1,
        },
    ],
    outputs: [{ id: 'line', name: 'Dynamic Zones RSI', defaultStyle: lineStyle('#7e57c2') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['dzrsi'],
    scaleRange: { min: 0, max: 100 },
    processorFactory: (parameters) => new DynamicZonesRsiProcessor(
        resolvedLength(parameters, 14),
        resolvedFinite(parameters?.oversoldLevel, 20, 'oversoldLevel'),
        resolvedFinite(parameters?.overboughtLevel, 80, 'overboughtLevel'),
    ),
});
