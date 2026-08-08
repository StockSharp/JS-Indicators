// Parity beyond the one operating point.
//
// numeric-parity.test.js compares every indicator against the platform bar-for-bar -- but on ONE
// series, at DEFAULT parameters. That series is well behaved by construction: it never repeats a
// price, never gaps, never divides by zero. So a port can be wrong about the length-1 boundary,
// about a flat window, about the oldest slot of its buffer, and still agree on every bar of it.
//
// This file scans the two axes that pass hides, both read from the same live C# dumper:
//
//   parameters   every indicator that owns a Length, run at 1, 2, 3, 6 and 21 (values.json
//                -> `variants`, produced by RunMatrix)
//   candle shape every indicator at its defaults over eight deliberately awkward series --
//                constant, rising, falling, spike, gap, alternating, zero volume, three bars
//                (stress.json, produced by --stress)
//
// Both are exact allow-lists: an unlisted divergence fails, and so does a listed one that no
// longer applies. That is the only form that does not rot -- a log line saying "12 diverge" is
// read once and never again.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getCalcFn } = require('../src/calc/index.js');
const { loadDumpStatus, readDump } = require('./csharp-dump.js');

// Relative + absolute tolerance for decimal (C#) vs double (JS), same as numeric-parity.
const TOL = 1e-6;

// ---------------------------------------------------------------------------------------------
// Known divergences. Each key is `Kind@length` or `Kind@shape`; each value says what differs and
// why it is not fixed yet. Anything here is a bug that is written down, not a bug that is allowed.
// ---------------------------------------------------------------------------------------------

const MATRIX_DIVERGENCES = {};

const STRESS_DIVERGENCES = {};

// Indicators the platform runs but this port has no calc for. Same exact-set rule as the other
// parity file: a new StockSharp indicator lands here as a FAILURE, not as a line in a log.
const NO_JS_CALC = {
    CandlePatternIndicator: 'pattern recognition, not a numeric series — no chart line to draw',
};

// Not comparable bar-for-bar at all, for a structural reason rather than an unfixed bug. Same
// exact-set rule: an entry that stops applying fails, so this cannot quietly become a dumping
// ground.
const NOT_COMPARABLE = {
    VolumeProfileIndicator: 'a histogram over price levels, not a series — the C# GetValue is null and the JS calc returns buckets keyed by price',
};

function assertAllowList(observed, allowed, what) {
    const unexpected = observed.filter((k) => !(k in allowed));
    const stale = Object.keys(allowed).filter((k) => !observed.includes(k));
    const problems = [];
    if (unexpected.length) problems.push(`${what} NOT in the allow-list:\n  ${unexpected.join('\n  ')}`);
    if (stale.length) problems.push(`${what} allow-list entries that no longer apply (remove them): ${stale.join(', ')}`);
    assert.equal(problems.length, 0, problems.join('\n'));
}

// C# param keys are PascalCase (`Length`); the client calc fns read lowercase (`length`).
function toJsParams(csParams) {
    const out = {};
    for (const [k, v] of Object.entries(csParams || {})) out[k.toLowerCase()] = v;
    return out;
}

function numeric(x) {
    return typeof x === 'number' && Number.isFinite(x);
}

function close(js, cs) {
    if (cs === null || cs === undefined) return js === null || js === undefined || !numeric(js);
    if (!numeric(js)) return false;
    return Math.abs(js - cs) <= TOL * Math.max(1, Math.abs(cs));
}

// A JS calc returns either an array of points or an object of named line arrays (and a ribbon
// returns an array of series). Flatten all of it to plain number arrays; which name a line has is
// not the subject here, so each C# line is matched against whichever JS line reproduces it.
function jsLines(jsOut) {
    const asLine = (arr) => arr.map((p) => (p && typeof p === 'object' && !Array.isArray(p)) ? p.value : p);
    const lines = [];
    const push = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return;
        if (Array.isArray(arr[0])) arr.forEach(push);
        else lines.push(asLine(arr));
    };
    if (!jsOut) return lines;
    if (Array.isArray(jsOut)) push(jsOut);
    else for (const k of Object.keys(jsOut)) push(jsOut[k]);
    return lines;
}

const lineMatch = (a, b) => a.length === b.length && b.every((v, i) => close(a[i], v));

// Compare one C# result (scalar values or per-line arrays) against what the calc produces for the
// same candles and parameters. Returns null when they agree, or a short human-readable reason.
function compare(fn, candles, params, cs) {
    let jsOut;
    try { jsOut = fn(candles, params); }
    catch (error) { return `threw: ${error && error.message}`; }

    if (Array.isArray(cs.values)) {
        // The C# side exposes one scalar even for indicators whose JS calc returns several named
        // lines (MACD hands back macd/signal/histogram; the platform's value is the macd line).
        // Accept whichever line reproduces it rather than hard-coding a per-indicator field map:
        // a map has to be maintained, and it silently mislabels the day an output is renamed.
        const candidates = jsLines(jsOut);
        if (candidates.length === 0) return 'produced no line';
        if (candidates.some((line) => lineMatch(line, cs.values))) return null;

        const line = candidates[0];
        if (line.length !== cs.values.length) return `length js=${line.length} cs=${cs.values.length}`;
        for (let i = 0; i < cs.values.length; i++) {
            if (!close(line[i], cs.values[i])) {
                return `bar ${i}: js=${JSON.stringify(line[i])} cs=${JSON.stringify(cs.values[i])}`;
            }
        }
        return null;
    }

    const candidates = jsLines(jsOut);
    const unmatched = [];
    for (let li = 0; li < cs.lines.length; li++) {
        if (!candidates.some((jc) => lineMatch(jc, cs.lines[li]))) {
            unmatched.push((cs.lineNames && cs.lineNames[li]) || `#${li}`);
        }
    }
    return unmatched.length === 0 ? null : `unmatched line(s): ${unmatched.join(', ')}`;
}

const status = loadDumpStatus();
const available = status.available;

describe('parity scan: parameter matrix', () => {
    it('every indicator that owns a Length matches StockSharp at 1, 2, 3, 6 and 21', (t) => {
        if (!available) return t.skip(`StockSharp .NET dump unavailable: ${status.reason}`);

        const dump = readDump('values.json');
        const candles = dump.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));

        const diverged = [];
        let compared = 0;
        let covered = 0;

        for (const cs of dump.indicators || []) {
            if (!Array.isArray(cs.variants) || cs.variants.length === 0) continue;
            const fn = getCalcFn(cs.kind);
            if (!fn) continue; // the default pass already asserts the no-calc allow-list
            covered += 1;

            for (const variant of cs.variants) {
                compared += 1;
                const params = { ...toJsParams(cs.params), length: variant.length };
                const reason = compare(fn, candles, params, variant);
                if (reason) diverged.push(`${cs.kind}@${variant.length}  ${reason}`);
            }
        }

        console.log(`[parity-scan] matrix: ${covered} indicators, ${compared} runs, ${diverged.length} diverging`);
        assert.ok(compared > 300, `the matrix compared only ${compared} runs — the dump lost its variants`);
        assertAllowList(diverged.map((d) => d.split('  ')[0]), MATRIX_DIVERGENCES, 'parameter-matrix divergences');
        assert.equal(diverged.length, Object.keys(MATRIX_DIVERGENCES).length,
            'divergences at non-default lengths:\n' + diverged.join('\n'));
    });
});

describe('parity scan: candle shapes', () => {
    it('every indicator matches StockSharp on constant, gapped, spiked and degenerate series', (t) => {
        if (!available) return t.skip(`StockSharp .NET dump unavailable: ${status.reason}`);

        const stress = readDump('stress.json');
        const diverged = [];
        const noFn = new Set();
        const skipped = new Set();
        let compared = 0;

        for (const series of stress.series || []) {
            const candles = series.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
            for (const cs of series.indicators || []) {
                if (cs.kind in NOT_COMPARABLE) { skipped.add(cs.kind); continue; }
                const fn = getCalcFn(cs.kind);
                if (!fn) { noFn.add(cs.kind); continue; }
                compared += 1;
                const reason = compare(fn, candles, toJsParams(cs.params), cs);
                if (reason) diverged.push(`${cs.kind}@${series.name}  ${reason}`);
            }
        }

        console.log(`[parity-scan] shapes: ${stress.series.length} series, ${compared} runs, ${diverged.length} diverging`);
        assert.ok(compared > 800, `the stress pass compared only ${compared} runs — the dump is short`);
        assertAllowList([...noFn], NO_JS_CALC, 'stress indicators with no JS calc fn');
        assertAllowList([...skipped], NOT_COMPARABLE, 'stress indicators held back from comparison');
        assertAllowList(diverged.map((d) => d.split('  ')[0]), STRESS_DIVERGENCES, 'candle-shape divergences');
        assert.equal(diverged.length, Object.keys(STRESS_DIVERGENCES).length,
            'divergences on awkward candle shapes:\n' + diverged.join('\n'));
    });
});
