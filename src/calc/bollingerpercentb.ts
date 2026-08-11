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
    RollingStandardDeviation,
    SimpleMovingAverage,
} from '../math/index.js';
import {
    BollingerBandsCheckpoint,
    style,
} from './shared/compound.js';
import {
    finite,
    integer,
    number,
} from './shared/guards.js';

export interface BollingerPercentBParameters extends IndicatorParameters {
    readonly length: number;
    readonly stdDevMultiplier: number;
}

export class BollingerPercentBProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    BollingerBandsCheckpoint
> {
    private readonly average: SimpleMovingAverage;
    private readonly deviation: RollingStandardDeviation;

    constructor(readonly length: number, readonly stdDevMultiplier: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        number(stdDevMultiplier, stdDevMultiplier, 0.1, 500, 'stdDevMultiplier');
        this.average = new SimpleMovingAverage(length);
        this.deviation = new RollingStandardDeviation(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        // BollingerBand reads the committed current values of its shared MA and
        // deviation. Their non-final calculations do not become the band values.
        const middle = commit ? this.average.push(close) : this.average.value;
        const deviation = commit ? this.deviation.push(close) : this.deviation.value;
        const formed = close !== null && middle !== null && deviation !== null;
        const width = formed ? 2 * this.stdDevMultiplier * deviation : 0;
        const value = formed && width !== 0
            ? (close - (middle - this.stdDevMultiplier * deviation)) / width * 100
            : null;
        return {
            isFormed: formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.average.reset();
        this.deviation.reset();
    }

    protected captureState(): BollingerBandsCheckpoint {
        return Object.freeze({
            average: this.average.checkpoint(),
            deviation: this.deviation.checkpoint(),
        });
    }

    protected restoreState(state: BollingerBandsCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || state.average?.values?.length !== state.deviation?.values?.length) {
            throw new TypeError('sschart: invalid Bollinger Percent B checkpoint');
        }
        this.average.restore(state.average);
        this.deviation.restore(state.deviation);
    }
}

export const BollingerPercentBIndicator: IndicatorDefinition<
    IndicatorCandle,
    BollingerPercentBParameters
> = registerIndicator({
    id: 'BollingerPercentB',
    name: 'Bollinger Percent B',
    description: 'Price position inside the Bollinger envelope expressed in percent units.',
    category: IndicatorCategory.Volatility,
    input: CandlestickIndicatorInput,
    parameters: [
        {
            id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
            defaultValue: 20, min: 1, max: 500, step: 1,
        },
        {
            id: 'stdDevMultiplier', name: 'Standard Deviation Multiplier',
            type: IndicatorParameterType.Number,
            defaultValue: 2, min: 0.1, max: 500, step: 0.1,
        },
    ],
    outputs: [{
        id: 'line', name: '%B',
        defaultStyle: style(IndicatorSeriesStyle.Line, '#42a5f5', 2),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['bbpercentb'],
    levels: [0, 100],
    processorFactory: (parameters) => new BollingerPercentBProcessor(
        integer(parameters?.length, 20, 1, 500, 'length'),
        number(parameters?.stdDevMultiplier, 2, 0.1, 500, 'stdDevMultiplier'),
    ),
});
