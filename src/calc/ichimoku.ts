import {
    CandlestickIndicatorInput,
    IndicatorCategory,
    IndicatorMeasure,
    IndicatorPane,
    IndicatorParameterType,
    IndicatorSeriesStyle,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorOutputValue,
    type IndicatorParameters,
    type IndicatorProcessInput,
} from '../indicator-definition.js';
import { registerIndicator } from '../indicator-registry.js';
import {
    SequentialIndicatorProcessor,
    type IndicatorCalculationResult,
} from '../sequential-processor.js';
import {
    RingBuffer,
    RollingMaximum,
    RollingMinimum,
    type RingBufferCheckpoint,
    type RollingWindowCheckpoint,
} from '../math/index.js';
import {
    lineStyle,
    period,
    validWindow,
} from './shared/shifted-sparse.js';
import {
    finite,
} from './shared/guards.js';

export function parameter(
    values: IchimokuParameters,
    name: 'tenkanLength' | 'kijunLength' | 'senkouBLength',
    alias: 'tenkanPeriod' | 'kijunPeriod' | 'senkouBPeriod',
    fallback: number,
    maximum: number,
): number {
    const minimum = name === 'tenkanLength' || name === 'kijunLength' ? 2 : 1;
    return period(values?.[name] ?? values?.[alias], fallback, minimum, maximum, name);
}

export function lengthParameter(
    id: 'tenkanLength' | 'kijunLength' | 'senkouBLength' | 'chinkouLength',
    name: string,
    defaultValue: number,
    maximum: number,
) {
    const minimum = id === 'tenkanLength' || id === 'kijunLength' ? 2 : 1;
    return {
        id,
        name,
        type: IndicatorParameterType.Integer,
        defaultValue,
        min: minimum,
        max: maximum,
        step: 1,
    } as const;
}

export interface IchimokuParameters extends IndicatorParameters {
    readonly tenkanLength: number;
    readonly kijunLength: number;
    readonly senkouBLength: number;
    readonly chinkouLength: number;
}

export interface IchimokuCheckpoint {
    readonly tenkanHigh: RollingWindowCheckpoint;
    readonly tenkanLow: RollingWindowCheckpoint;
    readonly kijunHigh: RollingWindowCheckpoint;
    readonly kijunLow: RollingWindowCheckpoint;
    readonly senkouBHigh: RollingWindowCheckpoint;
    readonly senkouBLow: RollingWindowCheckpoint;
    /** The spans held back for Kijun bars, which a preview reports and never adds to. */
    readonly senkouADelay: RingBufferCheckpoint<number | null>;
    readonly senkouBDelay: RingBufferCheckpoint<number | null>;
}

export class IchimokuProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    IchimokuCheckpoint
> {
    private readonly tenkanHigh: RollingMaximum;
    private readonly tenkanLow: RollingMinimum;
    private readonly kijunHigh: RollingMaximum;
    private readonly kijunLow: RollingMinimum;
    private readonly senkouBHigh: RollingMaximum;
    private readonly senkouBLow: RollingMinimum;
    private readonly senkouADelay: RingBuffer<number | null>;
    private readonly senkouBDelay: RingBuffer<number | null>;

    constructor(
        readonly tenkanLength: number,
        readonly kijunLength: number,
        readonly senkouBLength: number,
        readonly chinkouLength: number,
    ) {
        super(['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou']);
        period(tenkanLength, tenkanLength, 2, 200, 'tenkanLength');
        period(kijunLength, kijunLength, 2, 400, 'kijunLength');
        period(senkouBLength, senkouBLength, 1, 400, 'senkouBLength');
        period(chinkouLength, chinkouLength, 1, 400, 'chinkouLength');
        this.tenkanHigh = new RollingMaximum(tenkanLength);
        this.tenkanLow = new RollingMinimum(tenkanLength);
        this.kijunHigh = new RollingMaximum(kijunLength);
        this.kijunLow = new RollingMinimum(kijunLength);
        this.senkouBHigh = new RollingMaximum(senkouBLength);
        this.senkouBLow = new RollingMinimum(senkouBLength);
        this.senkouADelay = new RingBuffer(kijunLength);
        this.senkouBDelay = new RingBuffer(kijunLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        // `IchimokuLine` previews over `_buffer.Skip(1).Append((high, low))`: the forming bar
        // takes the oldest sample's place, so the window is Length prices, not Length + 1.
        const tenkanHigh = commit
            ? this.tenkanHigh.push(high)
            : this.tenkanHigh.previewWithoutOldest(high);
        const tenkanLow = commit
            ? this.tenkanLow.push(low)
            : this.tenkanLow.previewWithoutOldest(low);
        const kijunHigh = commit
            ? this.kijunHigh.push(high)
            : this.kijunHigh.previewWithoutOldest(high);
        const kijunLow = commit
            ? this.kijunLow.push(low)
            : this.kijunLow.previewWithoutOldest(low);
        const senkouBHigh = commit
            ? this.senkouBHigh.push(high)
            : this.senkouBHigh.previewWithoutOldest(high);
        const senkouBLow = commit
            ? this.senkouBLow.push(low)
            : this.senkouBLow.previewWithoutOldest(low);

        const tenkan = tenkanHigh === null || tenkanLow === null
            ? null
            : (tenkanHigh + tenkanLow) / 2;
        const kijun = kijunHigh === null || kijunLow === null
            ? null
            : (kijunHigh + kijunLow) / 2;
        const spanA = tenkan === null || kijun === null ? null : (tenkan + kijun) / 2;
        const spanB = senkouBHigh === null || senkouBLow === null
            ? null
            : (senkouBHigh + senkouBLow) / 2;
        const values: IndicatorOutputValue[] = [
            this.formedOutput('tenkan', tenkan, this.tenkanHigh.isFormed && this.tenkanLow.isFormed, input.index),
            this.formedOutput('kijun', kijun, this.kijunHigh.isFormed && this.kijunLow.isFormed, input.index),
            ...this.forward(
                'senkouA',
                this.senkouADelay,
                spanA,
                Math.max(this.tenkanLength, this.kijunLength) - 1,
                input.index,
                commit,
            ),
            ...this.forward(
                'senkouB',
                this.senkouBDelay,
                spanB,
                Math.max(this.senkouBLength, this.kijunLength) - 1,
                input.index,
                commit,
            ),
            this.formedOutput(
                'chikou',
                close,
                input.index >= this.chinkouLength - 1,
                input.index,
            ),
        ];
        return {
            isFormed: input.index >= this.senkouBLength + this.kijunLength - 2
                && input.index >= this.chinkouLength - 1,
            values,
        };
    }

    protected resetState(): void {
        this.tenkanHigh.reset();
        this.tenkanLow.reset();
        this.kijunHigh.reset();
        this.kijunLow.reset();
        this.senkouBHigh.reset();
        this.senkouBLow.reset();
        this.senkouADelay.clear();
        this.senkouBDelay.clear();
    }

    protected captureState(): IchimokuCheckpoint {
        return Object.freeze({
            tenkanHigh: this.tenkanHigh.checkpoint(),
            tenkanLow: this.tenkanLow.checkpoint(),
            kijunHigh: this.kijunHigh.checkpoint(),
            kijunLow: this.kijunLow.checkpoint(),
            senkouBHigh: this.senkouBHigh.checkpoint(),
            senkouBLow: this.senkouBLow.checkpoint(),
            senkouADelay: this.senkouADelay.checkpoint(),
            senkouBDelay: this.senkouBDelay.checkpoint(),
        });
    }

    protected restoreState(state: IchimokuCheckpoint): void {
        if (!validWindow(state?.tenkanHigh, this.tenkanLength)
            || !validWindow(state?.tenkanLow, this.tenkanLength)
            || !validWindow(state?.kijunHigh, this.kijunLength)
            || !validWindow(state?.kijunLow, this.kijunLength)
            || !validWindow(state?.senkouBHigh, this.senkouBLength)
            || !validWindow(state?.senkouBLow, this.senkouBLength)
            || !validWindow(state?.senkouADelay, this.kijunLength)
            || !validWindow(state?.senkouBDelay, this.kijunLength)) {
            throw new TypeError('sschart: invalid Ichimoku checkpoint');
        }
        this.tenkanHigh.restore(state.tenkanHigh);
        this.tenkanLow.restore(state.tenkanLow);
        this.kijunHigh.restore(state.kijunHigh);
        this.kijunLow.restore(state.kijunLow);
        this.senkouBHigh.restore(state.senkouBHigh);
        this.senkouBLow.restore(state.senkouBLow);
        this.senkouADelay.restore(state.senkouADelay);
        this.senkouBDelay.restore(state.senkouBDelay);
    }

    private forward(
        outputId: 'senkouA' | 'senkouB',
        delay: RingBuffer<number | null>,
        value: number | null,
        rawFirst: number,
        sourceIndex: number,
        commit: boolean,
    ): IndicatorOutputValue[] {
        // A forming bar never reaches the platform's delay line: `IchimokuSenkouALine` pushes
        // `if (input.IsFinal)` and answers `Buffer[0]`. So a preview repeats the span already
        // standing on this bar and adds nothing to the future one.
        if (!commit) {
            return delay.full
                ? [this.formedOutput(outputId, delay.front() ?? null, true, sourceIndex)]
                : [];
        }
        if (sourceIndex < rawFirst) return [];
        if (outputId === 'senkouB' && this.senkouBLength < this.kijunLength) return [];
        if (outputId === 'senkouA' && this.kijunLength === 1)
            return [this.formedOutput(outputId, value, true, sourceIndex)];
        delay.push(value);
        if (sourceIndex === rawFirst) {
            return [
                this.formedOutput(outputId, value, true, sourceIndex + this.kijunLength - 1),
                this.formedOutput(outputId, value, true, sourceIndex + this.kijunLength),
            ];
        }
        return [this.formedOutput(outputId, value, true, sourceIndex + this.kijunLength)];
    }
}

export const IchimokuIndicator: IndicatorDefinition<
    IndicatorCandle,
    IchimokuParameters
> = registerIndicator({
    id: 'Ichimoku',
    name: 'Ichimoku',
    description: 'Ichimoku cloud with rolling high-low midpoints and forward Senkou spans.',
    category: IndicatorCategory.Trend,
    input: CandlestickIndicatorInput,
    parameters: [
        lengthParameter('tenkanLength', 'Tenkan', 9, 200),
        lengthParameter('kijunLength', 'Kijun', 26, 400),
        lengthParameter('senkouBLength', 'Senkou B', 52, 400),
        lengthParameter('chinkouLength', 'Chinkou', 26, 400),
    ],
    outputs: [
        { id: 'tenkan', name: 'Tenkan', defaultStyle: lineStyle('#FF6347') },
        { id: 'kijun', name: 'Kijun', defaultStyle: lineStyle('#1E90FF') },
        {
            id: 'senkouA',
            name: 'Senkou A',
            defaultStyle: {
                series: IndicatorSeriesStyle.Band,
                color: '#32CD32',
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'senkouB',
            name: 'Senkou B',
            defaultStyle: {
                series: IndicatorSeriesStyle.Band,
                color: '#FF1493',
                options: { priceLineVisible: false },
            },
        },
        {
            id: 'chikou',
            name: 'Chikou',
            defaultStyle: lineStyle('#EE82EE', { lineStyle: 2 }),
        },
    ],
    naturalPane: IndicatorPane.Overlay,
    measure: IndicatorMeasure.Price,
    aliases: ['ichimoku'],
    painter: 'ichimoku',
    processorFactory: (parameters) => new IchimokuProcessor(
        parameter(parameters, 'tenkanLength', 'tenkanPeriod', 9, 200),
        parameter(parameters, 'kijunLength', 'kijunPeriod', 26, 400),
        parameter(parameters, 'senkouBLength', 'senkouBPeriod', 52, 400),
        period(
            parameters?.chinkouLength ?? parameters?.chikouLength,
            26,
            1,
            400,
            'chinkouLength',
        ),
    ),
});
