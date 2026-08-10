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
    type RingBufferCheckpoint,
} from '../math/index.js';
import {
    period,
} from './shared/shifted-sparse.js';
import {
    finite,
} from './shared/guards.js';

export interface FractalsParameters extends IndicatorParameters {
    readonly length: number;
}

export interface FractalWindowValue {
    readonly high: number | null;
    readonly low: number | null;
}

export interface FractalsCheckpoint {
    readonly window: RingBufferCheckpoint<FractalWindowValue>;
    readonly upCounter: number;
    readonly downCounter: number;
}

export class FractalsProcessor extends SequentialIndicatorProcessor<
    IndicatorCandle,
    FractalsCheckpoint
> {
    private readonly window: RingBuffer<FractalWindowValue>;
    private upCounter = 0;
    private downCounter = 0;

    constructor(readonly length: number) {
        super(['up', 'down']);
        if (!Number.isInteger(length) || length < 3 || length > 99 || length % 2 === 0) {
            throw new RangeError(
                'sschart: indicator length must be an odd integer from 3 to 99',
            );
        }
        this.window = new RingBuffer(length);
    }

    protected calculate(
        input: IndicatorProcessInput<IndicatorCandle>,
        commit: boolean,
    ): IndicatorCalculationResult {
        const current = Object.freeze({
            high: finite(input.value?.high),
            low: finite(input.value?.low),
        });
        const window = this.window.toArray();
        if (window.length === this.length) window.shift();
        window.push(current);

        const upCounter = this.upCounter + 1;
        const downCounter = this.downCounter + 1;
        const up = upCounter >= this.length ? this.pivot(window, 'high', true) : null;
        const down = downCounter >= this.length ? this.pivot(window, 'low', false) : null;
        if (commit) {
            this.window.push(current);
            this.upCounter = up === null ? upCounter : 0;
            this.downCounter = down === null ? downCounter : 0;
        }

        const targetIndex = input.index - Math.floor(this.length / 2);
        const values: IndicatorOutputValue[] = [];
        if (up !== null) values.push(this.output('up', up, targetIndex));
        if (down !== null) values.push(this.output('down', down, targetIndex));
        return {
            isFormed: window.length === this.length,
            values,
        };
    }

    protected resetState(): void {
        this.window.clear();
        this.upCounter = 0;
        this.downCounter = 0;
    }

    protected captureState(): FractalsCheckpoint {
        return Object.freeze({
            window: this.window.checkpoint(),
            upCounter: this.upCounter,
            downCounter: this.downCounter,
        });
    }

    protected restoreState(state: FractalsCheckpoint): void {
        const values = state?.window?.values;
        if (!Array.isArray(values) || values.length > this.length
            || values.some((item) => item === null || typeof item !== 'object'
                || (item.high !== null && finite(item.high) === null)
                || (item.low !== null && finite(item.low) === null))
            || !Number.isInteger(state.upCounter) || state.upCounter < 0
            || !Number.isInteger(state.downCounter) || state.downCounter < 0) {
            throw new TypeError('sschart: invalid Fractals checkpoint');
        }
        this.window.restore({
            values: Object.freeze(values.map((item) => Object.freeze({ ...item }))),
        });
        this.upCounter = state.upCounter;
        this.downCounter = state.downCounter;
    }

    private pivot(
        values: readonly FractalWindowValue[],
        field: 'high' | 'low',
        upward: boolean,
    ): number | null {
        if (values.length !== this.length) return null;
        const middle = Math.floor(this.length / 2);
        for (let index = 0; index < this.length - 1; index += 1) {
            const left = values[index][field];
            const right = values[index + 1][field];
            if (left === null || right === null) return null;
            const rising = upward ? left < right : left > right;
            const falling = upward ? left > right : left < right;
            if (index < middle ? !rising : !falling) return null;
        }
        return values[middle][field];
    }
}

export const FractalsIndicator: IndicatorDefinition<
    IndicatorCandle,
    FractalsParameters
> = registerIndicator({
        id: 'Fractals',
        name: 'Fractals',
        description: 'Bill Williams fractal pivots placed on their confirmed center candles.',
        category: IndicatorCategory.SupportResistance,
        input: CandlestickIndicatorInput,
        parameters: [{
            id: 'length',
            name: 'Length',
            type: IndicatorParameterType.Integer,
            defaultValue: 5,
            min: 3,
            max: 99,
            step: 2,
        }],
        outputs: [
            {
                id: 'up',
                name: 'Up',
                defaultStyle: {
                    series: IndicatorSeriesStyle.Markers,
                    color: '#32CD32',
                    options: { pointMarkersRadius: 4 },
                },
            },
            {
                id: 'down',
                name: 'Down',
                defaultStyle: {
                    series: IndicatorSeriesStyle.Markers,
                    color: '#FF3D57',
                    options: { pointMarkersRadius: 4 },
                },
            },
        ],
        naturalPane: IndicatorPane.Overlay,
        measure: IndicatorMeasure.Price,
        aliases: ['fractals'],
        painter: 'fractals',
        processorFactory: (parameters) => new FractalsProcessor(
            period(parameters?.length, 5, 3, 99, 'length'),
        ),
    });
