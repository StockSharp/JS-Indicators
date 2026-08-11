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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
    type RingBufferCheckpoint,
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

export interface WoodiesCciParameters extends IndicatorParameters {
    readonly length: number;
    readonly smaLength: number;
}

export interface WoodiesCciCheckpoint {
    readonly cci: RingBufferCheckpoint<number | null>;
    readonly signal: RollingWindowCheckpoint;
}

export class WoodiesCciProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    WoodiesCciCheckpoint
> {
    private readonly cci: CommodityChannelIndexKernel;
    private readonly signal: SimpleMovingAverage;

    constructor(readonly length: number, readonly smaLength: number) {
        super(['cci', 'signal']);
        integer(length, length, 1, 500, 'length');
        integer(smaLength, smaLength, 1, 500, 'smaLength');
        this.cci = new CommodityChannelIndexKernel(length);
        this.signal = new SimpleMovingAverage(smaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const typical = high === null || low === null || close === null
            ? null
            : (high + low + close) / 3;
        const cci = commit ? this.cci.push(typical) : this.cci.preview(typical);
        if (cci === null) {
            return {
                isFormed: false,
                values: [
                    this.output('cci', null, input.index),
                    this.output('signal', null, input.index),
                ],
            };
        }
        const signal = commit ? this.signal.push(cci) : this.signal.preview(cci);
        return {
            isFormed: this.signal.isFormed,
            values: [
                this.formedOutput('cci', cci, true, input.index),
                this.formedOutput('signal', signal, this.signal.isFormed, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.cci.reset();
        this.signal.reset();
    }

    protected captureState(): WoodiesCciCheckpoint {
        return Object.freeze({
            cci: this.cci.checkpoint(),
            signal: this.signal.checkpoint(),
        });
    }

    protected restoreState(state: WoodiesCciCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Woodies CCI checkpoint');
        this.cci.restore(state.cci);
        this.signal.restore(state.signal);
    }
}

export const WoodiesCciIndicator: IndicatorDefinition<
    IndicatorCandle,
    WoodiesCciParameters
> = registerIndicator({
    id: 'WoodiesCCI',
    name: 'Woodies CCI',
    description: 'Commodity Channel Index with a sequential simple-average signal line.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'CCI Length', type: IndicatorParameterType.Integer,
            defaultValue: 14, min: 1, max: 500, step: 1,
        },
        {
            id: 'smaLength', name: 'Signal Length', type: IndicatorParameterType.Integer,
            defaultValue: 6, min: 1, max: 500, step: 1,
            aliases: ['sMALength', 'smalength'],
        },
    ],
    outputs: [
        { id: 'cci', name: 'CCI', defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2) },
        { id: 'signal', name: 'Signal', defaultStyle: style(IndicatorSeriesStyle.Line, '#ffca28') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['wcci', 'woodiescci'],
    levels: [-100, 0, 100],
    processorFactory: (parameters) => new WoodiesCciProcessor(
        integer(parameters?.length, 14, 1, 500, 'length'),
        integer(parameters?.smaLength, 6, 1, 500, 'smaLength'),
    ),
});
