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
    DirectionalMovementCheckpoint,
    DirectionalMovementKernel,
    RecursiveLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/recursive-statistical.js';

export class DirectionalIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    DirectionalMovementCheckpoint
> {
    private readonly directional: DirectionalMovementKernel;

    constructor(readonly length: number) {
        super(['plusDI', 'minusDI', 'dx']);
        resolvedLength({ length }, length, 1, 500);
        this.directional = new DirectionalMovementKernel(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const { plusDI, minusDI, dx } = this.directional.process(input, commit);
        const formed = input.index >= this.length + 1 && dx !== null;
        return {
            isFormed: formed,
            values: [
                this.output('plusDI', formed ? plusDI : null, input.index),
                this.output('minusDI', formed ? minusDI : null, input.index),
                this.output('dx', formed ? dx : null, input.index),
            ],
        };
    }

    protected resetState(): void { this.directional.reset(); }
    protected captureState(): DirectionalMovementCheckpoint {
        return this.directional.checkpoint();
    }
    protected restoreState(state: DirectionalMovementCheckpoint): void {
        this.directional.restore(state);
    }
}

export const DirectionalIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    RecursiveLengthParameters
> = registerIndicator({
    id: 'DirectionalIndex',
    name: 'Directional Index',
    description: 'Positive and negative directional movement with their unsmoothed DX.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(5, 1, 500)],
    outputs: [
        { id: 'plusDI', name: '+DI', defaultStyle: lineStyle('#42a5f5', 1) },
        { id: 'minusDI', name: '-DI', defaultStyle: lineStyle('#ff7043', 1) },
        { id: 'dx', name: 'DX', defaultStyle: lineStyle('#ab47bc') },
    ],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['dx'],
    scaleRange: { min: 0, max: 100 },
    levels: [25],
    processorFactory: (parameters) => new DirectionalIndexProcessor(
        resolvedLength(parameters, 5, 1, 500),
    ),
});
