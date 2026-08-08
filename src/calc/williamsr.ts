// Williams %R (Larry Williams) — momentum oscillator scaled to -100..0.
//   %R[i] = -100 * (highestHigh(N) - close[i]) / (highestHigh(N) - lowestLow(N))
// where N == `length` and the window is the last N bars ending at i.
// Null until index `length-1` (warm-up). A perfectly flat window (highestHigh == lowestLow)
// has no defined %R -- the position of the close within a zero-width range is not a number --
// and StockSharp emits nothing there, so neither does this.

import type { CandlePoint, IndicatorParams } from './types.js';

/**
 * @param {{length?: number}} [params]
 * @returns {IndicatorPoint[]}
 */
export function calcWilliamsR(candles: CandlePoint[], params?: IndicatorParams) {
    const length = params && Number.isFinite(params.length) ? (params.length | 0) : 14;
    if (!Array.isArray(candles) || candles.length === 0) return [];

    const n = candles.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = { time: candles[i].time, value: null };

    if (length <= 0) return out;

    for (let i = length - 1; i < n; i++) {
        let hi = -Infinity;
        let lo = +Infinity;
        let bad = false;
        for (let j = i - length + 1; j <= i; j++) {
            const c = candles[j];
            const h = c && c.high;
            const l = c && c.low;
            if (typeof h !== 'number' || !Number.isFinite(h) ||
                typeof l !== 'number' || !Number.isFinite(l)) { bad = true; break; }
            if (h > hi) hi = h;
            if (l < lo) lo = l;
        }
        const close = candles[i] && candles[i].close;
        if (bad || typeof close !== 'number' || !Number.isFinite(close)) {
            out[i] = { time: candles[i].time, value: null };
            continue;
        }
        const range = hi - lo;
        out[i] = { time: candles[i].time, value: range === 0 ? null : -100 * (hi - close) / range };
    }
    return out;
}
