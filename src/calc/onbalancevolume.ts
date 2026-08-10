import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
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
    OnBalanceVolumeCheckpoint,
    OnBalanceVolumeKernel,
    lineStyle,
} from './shared/momentum-volume.js';

export class OnBalanceVolumeProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    OnBalanceVolumeCheckpoint
> {
    private readonly kernel = new OnBalanceVolumeKernel();

    constructor() { super(['line']); }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const value = this.kernel.process(input.value, commit);
        return {
            isFormed: value !== null,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.kernel.reset();
    }
    protected captureState(): OnBalanceVolumeCheckpoint {
        return this.kernel.checkpoint();
    }
    protected restoreState(state: OnBalanceVolumeCheckpoint): void {
        this.kernel.restore(state);
    }
}

export const OnBalanceVolumeIndicator: IndicatorDefinition<
    IndicatorCandle,
    IndicatorParameters
> = registerIndicator({
    id: 'OnBalanceVolume',
    name: 'On-Balance Volume',
    description: 'Cumulative volume signed by the direction of the closing price.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [],
    outputs: [{ id: 'line', name: 'OBV', defaultStyle: lineStyle('#ab47bc') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['onbalancevolume'],
    processorFactory: () => new OnBalanceVolumeProcessor(),
});
