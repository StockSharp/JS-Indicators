// Shared by the cumulative-price indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    IndicatorSeriesStyle,
    type IndicatorCandle,
} from '../../indicator-definition.js';
import {
    finite,
} from './guards.js';

export function typicalPrice(value: Readonly<IndicatorCandle>): number | null {
    const high = finite(value?.high);
    const low = finite(value?.low);
    const close = finite(value?.close);
    return high === null || low === null || close === null
        ? null
        : (high + low + close) / 3;
}

export const PRICE_LINE_STYLE = Object.freeze({
    series: IndicatorSeriesStyle.Line,
    color: '#26a69a',
    lineWidth: 2,
    options: Object.freeze({ priceLineVisible: false }),
});
