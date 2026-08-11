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
        super(['dx', 'adx']);
        resolvedLength({ length }, length, 1, 100);
        this.directional = new DirectionalMovementKernel(length);
        this.average = new ExpandingWilderMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const { dx } = this.directional.process(input, commit);

        const diFirst = this.length + 1;
        const adxRaw = commit
            ? this.average.push(input.index >= diFirst ? dx : null)
            : this.average.preview(input.index >= diFirst ? dx : null);
        const visibleDx = input.index >= diFirst ? dx : null;
        const adx = input.index >= diFirst + this.length - 1 ? adxRaw : null;
        return {
            isFormed: adx !== null,
            values: [
                this.formedOutput('dx', visibleDx, input.index >= diFirst, input.index),
                this.formedOutput('adx', adx, this.average.isFormed, input.index),
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
    description: 'Wilder directional movement index and its smoothed ADX line.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14, 1, 100)],
    outputs: [
        { id: 'dx', name: 'DMI', defaultStyle: lineStyle('#42a5f5', 1) },
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
