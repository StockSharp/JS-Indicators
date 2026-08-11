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
    MomentumLengthParameters,
    lengthParameter,
    lineStyle,
    resolvedLength,
} from './shared/momentum-volume.js';
import {
    finite,
} from './shared/guards.js';

export interface ApprovalFlowIndexCheckpoint {
    readonly previousClose: number;
    readonly totalUp: number;
    readonly totalDown: number;
    readonly count: number;
    readonly formed: boolean;
}

export class ApprovalFlowIndexProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    ApprovalFlowIndexCheckpoint
> {
    private previousClose = 0;
    private totalUp = 0;
    private totalDown = 0;
    private count = 0;
    private formed = false;

    constructor(readonly length: number) {
        super(['line']);
        if (!Number.isInteger(length) || length < 1)
            throw new RangeError('sschart: AFI length must be a positive integer');
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const close = finite(input.value?.close);
        if (close === null) {
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }
        if (this.previousClose === 0) {
            if (commit) this.previousClose = close;
            return {
                isFormed: false,
                values: [this.output('line', null, input.index)],
            };
        }

        const volume = finite(input.value?.volume) ?? 0;
        const count = this.formed ? this.count : this.count + 1;
        const formed = this.formed || count === this.length;
        const totalUp = this.totalUp + (close > this.previousClose ? volume : 0);
        const totalDown = this.totalDown + (close < this.previousClose ? volume : 0);
        const total = totalUp + totalDown;
        const value = formed && total !== 0
            ? finite(100 * (totalUp - totalDown) / total)
            : null;

        if (commit) {
            this.count = count;
            this.formed = formed;
            this.totalUp = totalUp;
            this.totalDown = totalDown;
            if (!formed) this.previousClose = close;
        }
        return {
            isFormed: commit ? formed : this.formed,
            values: [this.output('line', value, input.index)],
        };
    }

    protected resetState(): void {
        this.previousClose = 0;
        this.totalUp = 0;
        this.totalDown = 0;
        this.count = 0;
        this.formed = false;
    }

    protected captureState(): ApprovalFlowIndexCheckpoint {
        return Object.freeze({
            previousClose: this.previousClose,
            totalUp: this.totalUp,
            totalDown: this.totalDown,
            count: this.count,
            formed: this.formed,
        });
    }

    protected restoreState(state: ApprovalFlowIndexCheckpoint): void {
        if (state === null || typeof state !== 'object'
            || finite(state.previousClose) === null
            || finite(state.totalUp) === null || finite(state.totalDown) === null
            || !Number.isInteger(state.count) || state.count < 0 || state.count > this.length
            || typeof state.formed !== 'boolean'
            || state.formed !== (state.count === this.length)) {
            throw new TypeError('sschart: invalid Approval Flow Index checkpoint');
        }
        this.previousClose = state.previousClose;
        this.totalUp = state.totalUp;
        this.totalDown = state.totalDown;
        this.count = state.count;
        this.formed = state.formed;
    }
}

export const ApprovalFlowIndexIndicator: IndicatorDefinition<
    IndicatorCandle,
    MomentumLengthParameters
> = registerIndicator({
    id: 'ApprovalFlowIndex',
    name: 'Approval Flow Index',
    description: 'Cumulative balance of volume on approved upward and downward moves.',
    category: IndicatorCategory.Volume,
    input: CandlestickIndicatorInput,
    parameters: [lengthParameter(14)],
    outputs: [{ id: 'line', name: 'AFI', defaultStyle: lineStyle('#42a5f5') }],
    naturalPane: IndicatorPane.Separate,
    measure: IndicatorMeasure.Percent,
    aliases: ['afi', 'approvalflowindex'],
    scaleRange: { min: 0, max: 100 },
    levels: [50],
    processorFactory: (parameters) => new ApprovalFlowIndexProcessor(
        resolvedLength(parameters, 14),
    ),
});
