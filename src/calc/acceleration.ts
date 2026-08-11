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

export interface AccelerationParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly smaLength: number;
}

export interface AccelerationCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
    readonly average: RollingWindowCheckpoint;
}

export class AccelerationProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AccelerationCheckpoint
> {
    private readonly short: SimpleMovingAverage;
    private readonly long: SimpleMovingAverage;
    private readonly average: SimpleMovingAverage;

    constructor(
        readonly shortMaLength: number,
        readonly longMaLength: number,
        readonly smaLength: number,
    ) {
        super(['line']);
        this.short = new SimpleMovingAverage(shortMaLength);
        this.long = new SimpleMovingAverage(longMaLength);
        this.average = new SimpleMovingAverage(smaLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const median = high === null || low === null ? null : (high + low) / 2;
        const short = commit ? this.short.push(median) : this.short.preview(median);
        const long = commit ? this.long.push(median) : this.long.preview(median);
        const awesome = short === null || long === null ? null : short - long;
        const averageInput = this.long.isFormed ? awesome : null;
        const average = commit
            ? this.average.push(averageInput)
            : this.average.preview(averageInput);
        const value = awesome === null || average === null ? null : awesome - average;
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.short.reset();
        this.long.reset();
        this.average.reset();
    }
    protected captureState(): AccelerationCheckpoint {
        return Object.freeze({
            short: this.short.checkpoint(),
            long: this.long.checkpoint(),
            average: this.average.checkpoint(),
        });
    }
    protected restoreState(state: AccelerationCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Acceleration checkpoint');
        this.short.restore(state.short);
        this.long.restore(state.long);
        this.average.restore(state.average);
    }
}

export const AccelerationIndicator: IndicatorDefinition<
    IndicatorCandle,
    AccelerationParameters
> = registerIndicator({
    id: 'Acceleration',
    name: 'Acceleration',
    description: 'Awesome Oscillator displacement from its own moving average.',
    category: IndicatorCategory.Momentum,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'shortMaLength', name: 'Short Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
            aliases: ['aoShortMaLength'],
        },
        {
            id: 'longMaLength', name: 'Long Length', type: IndicatorParameterType.Integer,
            defaultValue: 34, min: 1, max: 500, step: 1,
            aliases: ['aoLongMaLength'],
        },
        {
            id: 'smaLength', name: 'Average Length', type: IndicatorParameterType.Integer,
            defaultValue: 5, min: 1, max: 500, step: 1,
        },
    ],
    outputs: [{ id: 'line', name: 'Acceleration', defaultStyle: style(IndicatorSeriesStyle.Line, '#ff7043', 2) }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,
    aliases: ['ac', 'acceleration'],
    levels: [0],
    processorFactory: (parameters) => new AccelerationProcessor(
        integer(parameters?.shortMaLength, 5, 1, 500, 'shortMaLength'),
        integer(parameters?.longMaLength, 34, 1, 500, 'longMaLength'),
        integer(parameters?.smaLength, 5, 1, 500, 'smaLength'),
    ),
});
