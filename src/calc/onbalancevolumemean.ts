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
    SimpleMovingAverage,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    MomentumLengthParameters,
    OnBalanceVolumeCheckpoint,
    OnBalanceVolumeKernel,
    lengthParameter,
    lineStyle,
    resolvedPeriod,
} from './shared/momentum-volume.js';

export interface OnBalanceVolumeMeanCheckpoint {
    readonly obv: OnBalanceVolumeCheckpoint;
    readonly average: RollingWindowCheckpoint;
}

export class OnBalanceVolumeMeanProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    OnBalanceVolumeMeanCheckpoint
> {
    private readonly obv = new OnBalanceVolumeKernel();
    private readonly average: SimpleMovingAverage;

    constructor(readonly length: number) {
        super(['line']);
        resolvedPeriod(length, length, 'length');
        this.average = new SimpleMovingAverage(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const obv = this.obv.process(input.value, commit);
        const value = commit ? this.average.push(obv) : this.average.preview(obv);
        return {
            isFormed: this.average.isFormed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.obv.reset();
        this.average.reset();
    }

    protected captureState(): OnBalanceVolumeMeanCheckpoint {
        return Object.freeze({
            obv: this.obv.checkpoint(),
            average: this.average.checkpoint(),
        });
    }

    protected restoreState(state: OnBalanceVolumeMeanCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid On-Balance Volume Mean checkpoint');
        this.obv.restore(state.obv);
        this.average.restore(state.average);
    }
}

export const OnBalanceVolumeMeanIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'OnBalanceVolumeMean',
    name: 'On-Balance Volume Mean',
    description: 'Simple moving average of the cumulative On-Balance Volume series.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(32)],
    outputs: [{
        id: 'line', name: 'OBV Mean',
        defaultStyle: lineStyle('#42a5f5'),
    }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Volume,
    aliases: ['obvmean', 'onbalancevolumemean'],
    processorFactory: (parameters) => new OnBalanceVolumeMeanProcessor(
        resolvedPeriod(parameters?.length, 14, 'length'),
    ),
});
