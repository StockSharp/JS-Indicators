import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorOutputValue,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    SmoothedMovingAverage,
    type SmoothedMovingAverageCheckpoint,
} from '../math/index.js';
import {
    AlligatorParameters,
    alligatorParameterSchema,
    lineStyle,
    period,
} from './shared/shifted-sparse.js';
import {
    finite,
} from './shared/guards.js';

export interface AlligatorCheckpoint {
    readonly jaw: SmoothedMovingAverageCheckpoint;
    readonly teeth: SmoothedMovingAverageCheckpoint;
    readonly lips: SmoothedMovingAverageCheckpoint;
}

export class AlligatorProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    AlligatorCheckpoint
> {
    private readonly jaw: SmoothedMovingAverage;
    private readonly teeth: SmoothedMovingAverage;
    private readonly lips: SmoothedMovingAverage;

    constructor(
        readonly jawLength: number,
        readonly jawShift: number,
        readonly teethLength: number,
        readonly teethShift: number,
        readonly lipsLength: number,
        readonly lipsShift: number,
    ) {
        super(['jaw', 'teeth', 'lips']);
        period(jawLength, jawLength, 1, 200, 'jawLength');
        period(jawShift, jawShift, 0, 100, 'jawShift');
        period(teethLength, teethLength, 1, 200, 'teethLength');
        period(teethShift, teethShift, 0, 100, 'teethShift');
        period(lipsLength, lipsLength, 1, 200, 'lipsLength');
        period(lipsShift, lipsShift, 0, 100, 'lipsShift');
        this.jaw = new SmoothedMovingAverage(jawLength);
        this.teeth = new SmoothedMovingAverage(teethLength);
        this.lips = new SmoothedMovingAverage(lipsLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const median = high === null || low === null ? null : (high + low) / 2;
        const jaw = commit ? this.jaw.push(median) : this.jaw.preview(median);
        const teeth = commit ? this.teeth.push(median) : this.teeth.preview(median);
        const lips = commit ? this.lips.push(median) : this.lips.preview(median);
        const values: IndicatorOutputValue[] = [];
        if (input.index >= this.jawLength - 1)
            values.push(this.output('jaw', jaw, input.index + this.jawShift));
        if (input.index >= this.teethLength - 1)
            values.push(this.output('teeth', teeth, input.index + this.teethShift));
        if (input.index >= this.lipsLength - 1)
            values.push(this.output('lips', lips, input.index + this.lipsShift));
        return {
            isFormed: values.some((value) => value.value !== null),
            values,
        };
    }

    protected resetState(): void {
        this.jaw.reset();
        this.teeth.reset();
        this.lips.reset();
    }
    protected captureState(): AlligatorCheckpoint {
        return Object.freeze({
            jaw: this.jaw.checkpoint(),
            teeth: this.teeth.checkpoint(),
            lips: this.lips.checkpoint(),
        });
    }
    protected restoreState(state: AlligatorCheckpoint): void {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: invalid Alligator checkpoint');
        this.jaw.restore(state.jaw);
        this.teeth.restore(state.teeth);
        this.lips.restore(state.lips);
    }
}

export const AlligatorIndicator: IndicatorDefinition<
    IndicatorCandle,
    AlligatorParameters
> = registerIndicator({
    id: 'Alligator',
    name: 'Alligator',
    description: 'Bill Williams median-price SMMA lines with independent forward shifts.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: alligatorParameterSchema(),
    outputs: [
        { id: 'jaw', name: 'Jaw', defaultStyle: lineStyle('#1E90FF') },
        { id: 'teeth', name: 'Teeth', defaultStyle: lineStyle('#FF0000') },
        { id: 'lips', name: 'Lips', defaultStyle: lineStyle('#32CD32') },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['alligator'],
    painter: 'alligator',
    processorFactory: (parameters) => new AlligatorProcessor(
        period(parameters?.jawLength, 13, 1, 200, 'jawLength'),
        period(parameters?.jawShift, 8, 0, 100, 'jawShift'),
        period(parameters?.teethLength, 8, 1, 200, 'teethLength'),
        period(parameters?.teethShift, 5, 0, 100, 'teethShift'),
        period(parameters?.lipsLength, 5, 1, 200, 'lipsLength'),
        period(parameters?.lipsShift, 3, 0, 100, 'lipsShift'),
    ),
});
