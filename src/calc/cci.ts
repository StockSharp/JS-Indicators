// Commodity Channel Index (Donald Lambert, 1980).
// typical[i]   = (high + low + close) / 3
// smaTP[i]     = SMA(typical, length)
// meanDev[i]   = (1/length) * Σ_{j=i-length+1..i} |typical[j] - smaTP[i]|
// CCI[i]       = (typical[i] - smaTP[i]) / (0.015 * meanDev[i])
//
// Null until index `length-1`. A flat typical-price window makes the mean deviation zero and
// the formula undefined; StockSharp emits nothing there, so neither does this. Flatness is
// tested on the prices themselves rather than on the computed deviation -- a rolling sum drifts
// by ~1e-14, so `meanDev === 0` is false even on an exactly flat window, and the division then
// returns the rounding residual divided by itself: +-1/0.015, i.e. +-66.7 out of nowhere.

import type { CandlePoint, IndicatorParams, IndicatorPoint } from './types.js';

/**
 * @param {CandlePoint[]} candles
 * @param {{length?: number}} [params]
 * @returns {IndicatorPoint[]}
 */
export function calcCCI(candles: CandlePoint[], params?: IndicatorParams): IndicatorPoint[] {
    const length = params && Number.isFinite(params.length) ? (params.length | 0) : 20;
    if (!Array.isArray(candles) || candles.length === 0) return [];

    const n = candles.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = { time: candles[i].time, value: null };

    if (length <= 0) return out;

    // Typical price per candle.
    const tp = new Array(n);
    for (let i = 0; i < n; i++) {
        const c = candles[i];
        const h = c && c.high;
        const l = c && c.low;
        const cl = c && c.close;
        if (typeof h !== 'number' || !Number.isFinite(h) ||
            typeof l !== 'number' || !Number.isFinite(l) ||
            typeof cl !== 'number' || !Number.isFinite(cl)) {
            tp[i] = null;
            continue;
        }
        tp[i] = (h + l + cl) / 3;
    }

    for (let i = length - 1; i < n; i++) {
        const tpi = tp[i];
        if (tpi === null) {
            out[i] = { time: candles[i].time, value: null };
            continue;
        }

        // One pass over the window: it decides validity, flatness and the mean together. The mean
        // is summed here rather than taken from a rolling accumulator so it is the exact arithmetic
        // mean of these bars -- see the note above on why the drift matters.
        let sum = 0;
        let bad = false;
        let flat = true;
        for (let j = i - length + 1; j <= i; j++) {
            const v = tp[j];
            if (v === null) { bad = true; break; }
            if (v !== tpi) flat = false;
            sum += v;
        }
        if (bad || flat) {
            out[i] = { time: candles[i].time, value: null };
            continue;
        }

        const mean = sum / length;
        let devSum = 0;
        for (let j = i - length + 1; j <= i; j++) devSum += Math.abs(tp[j] - mean);

        const meanDev = devSum / length;
        out[i] = { time: candles[i].time, value: meanDev === 0 ? null : (tpi - mean) / (0.015 * meanDev) };
    }
    return out;
}
