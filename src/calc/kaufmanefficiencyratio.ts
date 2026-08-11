import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    RollingEfficiencyRatio,
    type RollingEfficiencyRatioCheckpoint,
} from '../math/index.js';
import {
    AdaptiveLengthParameters,
} from './shared/adaptive.js';
import {
    finite,
    integer,
} from './shared/guards.js';

export class KaufmanEfficiencyRatioProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    RollingEfficiencyRatioCheckpoint
> {
    private readonly ratio: RollingEfficiencyRatio;

    constructor(readonly length: number) {
        super(['line']);
        integer(length, length, 1, 500, 'length');
        this.ratio = new RollingEfficiencyRatio(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        const value = commit ? this.ratio.push(close) : this.ratio.preview(close);
        return {
            isFormed: this.ratio.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void { this.ratio.reset(); }
    protected captureState(): RollingEfficiencyRatioCheckpoint {
        return this.ratio.checkpoint();
    }
    protected restoreState(state: RollingEfficiencyRatioCheckpoint): void {
        this.ratio.restore(state);
    }
}

export const KaufmanEfficiencyRatioIndicator: IndicatorDefinition<
    IndicatorCandle,
    AdaptiveLengthParameters
> = registerIndicator({
    id: 'KaufmanEfficiencyRatio',
    name: 'Kaufman Efficiency Ratio',
    description: 'Directional price change divided by total path volatility.',
    category: IndicatorCategory.MarketStrength,
    input: CandlestickIndicatorInput,
    parameters: [{
        id: 'length', name: 'Length', type: IndicatorParameterType.Integer,
        defaultValue: 10, min: 1, max: 500, step: 1,
    }],
    outputs: [{
        id: 'line', name: 'KER',
        defaultStyle: {
            series: IndicatorSeriesStyle.Line,
            color: '#7e57c2',
            lineWidth: 2,
            options: { priceLineVisible: false },
        },
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.MinusOnePlusOne,

    aliases: ['ker'],
    scaleRange: { min: 0, max: 1 },
    processorFactory: (parameters) => new KaufmanEfficiencyRatioProcessor(
        integer(parameters?.length, 10, 1, 500, 'length'),
    ),
});
