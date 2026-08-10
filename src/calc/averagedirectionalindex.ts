import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    ExpandingWilderMovingAverage,
    type ExpandingWilderMovingAverageCheckpoint,
} from '../math/index.js';
import { CommodityChannelIndexKernel } from '../math/commodity-channel-index.js';
import {
    DirectionalMovementCheckpoint,
    DirectionalMovementKernel,
    RecursiveLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/recursive-statistical.js';

export interface AverageDirectionalIndexCheckpoint extends DirectionalMovementCheckpoint {
    readonly average: ExpandingWilderMovingAverageCheckpoint;
}

export class AverageDirectionalIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AverageDirectionalIndexCheckpoint
> {
    private readonly directional: DirectionalMovementKernel;
    private readonly average: ExpandingWilderMovingAverage;

    constructor(readonly length: number) {
        super(['plusDI', 'minusDI', 'adx']);
        resolvedLength({ length }, length, 1, 100);
        this.directional = new DirectionalMovementKernel(length);
        this.average = new ExpandingWilderMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const { plusDI, minusDI, dx } = this.directional.process(input, commit);

        const diFirst = this.length + 1;
        const adxRaw = commit
            ? this.average.push(input.index >= diFirst ? dx : null)
            : this.average.preview(input.index >= diFirst ? dx : null);
        const visiblePlus = input.index >= diFirst ? plusDI : null;
        const visibleMinus = input.index >= diFirst ? minusDI : null;
        const adx = input.index >= diFirst + this.length - 1 ? adxRaw : null;
        return {
            isFormed: adx !== null,
            values: [
                this.output('plusDI', visiblePlus, input.index),
                this.output('minusDI', visibleMinus, input.index),
                this.output('adx', adx, input.index),
            ],
        };
    }

    protected resetState(): void {
        this.directional.reset();
        this.average.reset();
    }

    protected captureState(): AverageDirectionalIndexCheckpoint {
        return Object.freeze({
            ...this.directional.checkpoint(),
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: AverageDirectionalIndexCheckpoint): void {
        this.directional.restore(state);
        this.average.restore(state.average);
    }
}

export const AverageDirectionalIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'AverageDirectionalIndex',
    name: 'ADX',
    description: 'Wilder directional movement index with positive, negative and ADX lines.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14, 1, 100)],
    outputs: [
        { id: 'plusDI', name: '+DI', defaultStyle: lineStyle('#42a5f5', 1) },
        { id: 'minusDI', name: '-DI', defaultStyle: lineStyle('#ff7043', 1) },
        { id: 'adx', name: 'ADX', defaultStyle: lineStyle('#ab47bc') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['adx'],
    painter: 'adx',
    processorFactory: (parameters) => new AverageDirectionalIndexProcessor(
        resolvedLength(parameters, 14, 1, 100),
    ),
});
