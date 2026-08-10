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
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface ElderImpulseParameters extends IndicatorParameters {
    readonly emaLength: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
}

export interface ElderImpulseCheckpoint {
    readonly ema: PartialSeedExponentialMovingAverageCheckpoint;
    readonly fast: PartialSeedExponentialMovingAverageCheckpoint;
    readonly slow: PartialSeedExponentialMovingAverageCheckpoint;
    readonly previousEma: number | null;
    readonly previousMacd: number | null;
}

export class ElderImpulseProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ElderImpulseCheckpoint
> {
    private readonly ema: PartialSeedExponentialMovingAverage;
    private readonly fast: PartialSeedExponentialMovingAverage;
    private readonly slow: PartialSeedExponentialMovingAverage;
    private readonly formBar: number;
    private previousEma: number | null = null;
    private previousMacd: number | null = null;

    constructor(
        readonly emaLength: number,
        readonly shortMaLength: number,
        readonly longMaLength: number,
    ) {
        super(['impulse']);
        integer(emaLength, emaLength, 1, 500, 'emaLength');
        integer(shortMaLength, shortMaLength, 1, 500, 'shortMaLength');
        integer(longMaLength, longMaLength, 1, 500, 'longMaLength');
        this.ema = new PartialSeedExponentialMovingAverage(emaLength);
        this.fast = new PartialSeedExponentialMovingAverage(shortMaLength);
        this.slow = new PartialSeedExponentialMovingAverage(longMaLength);
        this.formBar = Math.max(emaLength - 1, longMaLength - 1);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const ema = commit ? this.ema.push(close) : this.ema.preview(close);
        const fast = commit ? this.fast.push(close) : this.fast.preview(close);
        const slow = commit ? this.slow.push(close) : this.slow.preview(close);
        const macd = fast === null || slow === null ? null : finite(fast - slow);
        const formed = input.index >= this.formBar && input.index > 0
            && ema !== null && macd !== null
            && this.previousEma !== null && this.previousMacd !== null;

        let value: number | null = null;
        let state: 'green' | 'blue' | 'red' | null = null;
        if (formed) {
            if (ema > this.previousEma! && macd > this.previousMacd!) {
                value = 1;
                state = 'green';
            } else if (ema < this.previousEma! && macd < this.previousMacd!) {
                value = -1;
                state = 'red';
            } else {
                value = 0;
                state = 'blue';
            }
        }
        if (commit) {
            this.previousEma = ema;
            this.previousMacd = macd;
        }
        return {
            isFormed: formed,
            values: [this.output(
                'impulse',
                value,
                input.index,
                state === null ? undefined : { state },
            )],
        };
    }

    protected resetState(): void {
        this.ema.reset();
        this.fast.reset();
        this.slow.reset();
        this.previousEma = null;
        this.previousMacd = null;
    }

    protected captureState(): ElderImpulseCheckpoint {
        return Object.freeze({
            ema: this.ema.checkpoint(),
            fast: this.fast.checkpoint(),
            slow: this.slow.checkpoint(),
            previousEma: this.previousEma,
            previousMacd: this.previousMacd,
        });
    }

    protected restoreState(state: ElderImpulseCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || (state.previousEma !== null && finite(state.previousEma) === null)
            || (state.previousMacd !== null && finite(state.previousMacd) === null)
            || (state.previousEma === null) !== (state.previousMacd === null)) {
            throw new TypeError('sschart: invalid Elder Impulse checkpoint');
        }
        this.ema.restore(state.ema);
        this.fast.restore(state.fast);
        this.slow.restore(state.slow);
        this.previousEma = state.previousEma;
        this.previousMacd = state.previousMacd;
    }
}

export const ElderImpulseIndicator: IndicatorDefinition<
    IndicatorCandle,
    ElderImpulseParameters
> = registerIndicator({
    id: 'ElderImpulseSystem',
    name: 'Elder Impulse System',
    description: 'Discrete impulse state from the joint direction of EMA and MACD.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'emaLength', name: 'EMA Length', type: IndicatorParameterType.Integer,
            defaultValue: 13, min: 1, max: 500, step: 1,
        },
        {
            id: 'shortMaLength', name: 'Fast Length', type: IndicatorParameterType.Integer,
            defaultValue: 12, min: 1, max: 500, step: 1,
        },
        {
            id: 'longMaLength', name: 'Slow Length', type: IndicatorParameterType.Integer,
            defaultValue: 26, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{
        id: 'impulse', name: 'Impulse',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['elderimpulse'],
    scaleRange: { min: -1, max: 1 },
    levels: [0],
    processorFactory: (parameters) => new ElderImpulseProcessor(
        integer(parameters?.emaLength, 13, 1, 500, 'emaLength'),
        integer(parameters?.shortMaLength, 12, 1, 500, 'shortMaLength'),
        integer(parameters?.longMaLength, 26, 1, 500, 'longMaLength'),
    ),
});
