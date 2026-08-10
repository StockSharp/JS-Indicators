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
    RollingMaximum,
    RollingMinimum,
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
    return period(values?.[name] ?? values?.[alias], fallback, 1, maximum, name);
}

export function lengthParameter(
    id: 'tenkanLength' | 'kijunLength' | 'senkouBLength',
    name: string,
    defaultValue: number,
    maximum: number,
) {
    return {
        id,
        name,
        type: IndicatorParameterType.Integer,
        defaultValue,
        min: 1,
        max: maximum,
        step: 1,
    } as const;
}

export interface IchimokuParameters extends IndicatorParameters {
    readonly tenkanLength: number;
    readonly kijunLength: number;
    readonly senkouBLength: number;
}

export interface IchimokuCheckpoint {
    readonly tenkanHigh: RollingWindowCheckpoint;
    readonly tenkanLow: RollingWindowCheckpoint;
    readonly kijunHigh: RollingWindowCheckpoint;
    readonly kijunLow: RollingWindowCheckpoint;
    readonly senkouBHigh: RollingWindowCheckpoint;
    readonly senkouBLow: RollingWindowCheckpoint;
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

    constructor(
        readonly tenkanLength: number,
        readonly kijunLength: number,
        readonly senkouBLength: number,
    ) {
        super(['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou']);
        period(tenkanLength, tenkanLength, 1, 200, 'tenkanLength');
        period(kijunLength, kijunLength, 1, 400, 'kijunLength');
        period(senkouBLength, senkouBLength, 1, 400, 'senkouBLength');
        this.tenkanHigh = new RollingMaximum(tenkanLength);
        this.tenkanLow = new RollingMinimum(tenkanLength);
        this.kijunHigh = new RollingMaximum(kijunLength);
        this.kijunLow = new RollingMinimum(kijunLength);
        this.senkouBHigh = new RollingMaximum(senkouBLength);
        this.senkouBLow = new RollingMinimum(senkouBLength);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const high = finite(input.value?.high);
        const low = finite(input.value?.low);
        const close = finite(input.value?.close);
        const tenkanHigh = commit ? this.tenkanHigh.push(high) : this.tenkanHigh.preview(high);
        const tenkanLow = commit ? this.tenkanLow.push(low) : this.tenkanLow.preview(low);
        const kijunHigh = commit ? this.kijunHigh.push(high) : this.kijunHigh.preview(high);
        const kijunLow = commit ? this.kijunLow.push(low) : this.kijunLow.preview(low);
        const senkouBHigh = commit
            ? this.senkouBHigh.push(high)
            : this.senkouBHigh.preview(high);
        const senkouBLow = commit
            ? this.senkouBLow.push(low)
            : this.senkouBLow.preview(low);

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
            this.output('tenkan', tenkan, input.index),
            this.output('kijun', kijun, input.index),
            ...this.forward('senkouA', spanA, Math.max(this.tenkanLength, this.kijunLength) - 1, input.index),
            ...this.forward('senkouB', spanB, this.senkouBLength - 1, input.index),
            this.output(
                'chikou',
                input.index >= this.kijunLength - 1 ? close : null,
                input.index,
            ),
        ];
        return {
            isFormed: values.some((value) => value.value !== null),
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
    }

    protected captureState(): IchimokuCheckpoint {
        return Object.freeze({
            tenkanHigh: this.tenkanHigh.checkpoint(),
            tenkanLow: this.tenkanLow.checkpoint(),
            kijunHigh: this.kijunHigh.checkpoint(),
            kijunLow: this.kijunLow.checkpoint(),
            senkouBHigh: this.senkouBHigh.checkpoint(),
            senkouBLow: this.senkouBLow.checkpoint(),
        });
    }

    protected restoreState(state: IchimokuCheckpoint): void {
        if (!validWindow(state?.tenkanHigh, this.tenkanLength)
            || !validWindow(state?.tenkanLow, this.tenkanLength)
            || !validWindow(state?.kijunHigh, this.kijunLength)
            || !validWindow(state?.kijunLow, this.kijunLength)
            || !validWindow(state?.senkouBHigh, this.senkouBLength)
            || !validWindow(state?.senkouBLow, this.senkouBLength)) {
            throw new TypeError('sschart: invalid Ichimoku checkpoint');
        }
        this.tenkanHigh.restore(state.tenkanHigh);
        this.tenkanLow.restore(state.tenkanLow);
        this.kijunHigh.restore(state.kijunHigh);
        this.kijunLow.restore(state.kijunLow);
        this.senkouBHigh.restore(state.senkouBHigh);
        this.senkouBLow.restore(state.senkouBLow);
    }

    private forward(
        outputId: 'senkouA' | 'senkouB',
        value: number | null,
        rawFirst: number,
        sourceIndex: number,
    ): IndicatorOutputValue[] {
        if (sourceIndex < rawFirst) return [];
        if (sourceIndex === rawFirst) {
            return [
                this.output(outputId, value, sourceIndex + this.kijunLength - 1),
                this.output(outputId, value, sourceIndex + this.kijunLength),
            ];
        }
        return [this.output(outputId, value, sourceIndex + this.kijunLength)];
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
    ),
});
