// Parity beyond the one operating point.
//
// numeric-parity.test.js compares every indicator against the platform bar-for-bar -- but on ONE
// series, at DEFAULT parameters. That series is well behaved by construction: it never repeats a
// price, never gaps, never divides by zero. So a port can be wrong about the length-1 boundary,
// about a flat window, about the oldest slot of its buffer, and still agree on every bar of it.
//
// This file scans the two axes that pass hides, both read from the same live C# dumper:
//
//   parameters   every settable parameter moved off its default, not just Length -- integers at
//                1, 2, 3, 6 and 21, booleans both ways, fractions at 0.5, 1 and 2 (values.json
//                -> `variants`, produced by RunMatrix)
//   candle shape every indicator at its defaults over thirteen deliberately awkward series --
//                constant, rising, falling, spike, gap, alternating, zero volume, tiny, zero
//                price, down only, flat plateau, ties, steps (stress.json, produced by --stress)
//
// Both axes run on final input only. The forming bar is compared in numeric-parity.test.js, and
// only at default parameters against a series long enough that everything has warmed up -- see
// AGENTS.md, which says what that leaves uncovered.
//
// A divergence fails. There is no list to put one on, deliberately: a written-down bug is still a
// green test, and a green test is what everybody reads. If this file is red, the port disagrees
// with the platform somewhere, and the message names every place.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { runtimeSeries } = require('./runtime-series.js');
const { getIndicatorDefinition } = require('../src/index.js');
const { loadDumpStatus, readDump, requireDump } = require('./csharp-dump.js');
const { assertRecorded } = require('./parity-exceptions.js');

// Relative + absolute tolerance for decimal (C#) vs double (JS).
// Decimal on the platform, double here, so the two cannot agree to the last bit. This is the size
// of that gap and nothing more: across every comparison in this suite the largest honest
// difference measured is ~1.4e-11, so 1e-9 leaves two orders of magnitude of headroom while
// refusing an arithmetic mistake. It used to be 1e-6, which on a price of 100 accepted an error of
// 1e-4 -- five orders of magnitude of cover for a real bug.
const TOL = 1e-9;

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
function compare(kind, candles, params, cs) {
    let jsOut;
    try { jsOut = runtimeSeries(kind, candles, params); }
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

/// The parameters a variant asks for: the indicator's defaults with one setting moved. The C# name
/// is PascalCase and the client calcs read either all-lower or camelCase, so both spellings are
/// set -- the same rule the default parameters already go through.
function variantParams(cs, variant) {
    const params = { ...toJsParams(cs.params) };
    const name = variant.param;
    params[name.toLowerCase()] = variant.value;
    params[name.charAt(0).toLowerCase() + name.slice(1)] = variant.value;
    return params;
}

/// How a variant reads in a failure message: `Length=6`, `Inverted=true`.
function variantLabel(variant) {
    return `${variant.param}=${variant.value}`;
}

/// Whether the platform itself answered differently at this setting than at its default. Without
/// that there is nothing to expect from the port either.
function csMoved(cs, variant) {
    if (Array.isArray(cs.values) && Array.isArray(variant.values)) {
        return JSON.stringify(cs.values) !== JSON.stringify(variant.values);
    }
    if (Array.isArray(cs.lines) && Array.isArray(variant.lines)) {
        return JSON.stringify(cs.lines) !== JSON.stringify(variant.lines);
    }
    return false;
}

const status = loadDumpStatus();
const available = status.available;

describe('parity scan: parameter matrix', () => {
    it('every indicator matches StockSharp with each of its parameters moved', (t) => {
        if (!requireDump(t, status)) return;

        const dump = readDump('values.json');
        const candles = dump.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));

        const diverged = [];
        let compared = 0;
        let covered = 0;

        for (const cs of dump.indicators || []) {
            if (!Array.isArray(cs.variants) || cs.variants.length === 0) continue;
            if (!getIndicatorDefinition(cs.kind)) continue;
            covered += 1;

            // What the port draws at the indicator's own defaults, to tell "we disagree about this
            // setting" from "we never read this setting". A calc that ignores a parameter name it
            // does not know would otherwise compare its default output to the platform's default
            // output and pass, and the whole sweep over that parameter would be a green nothing.
            let baseline;
            try { baseline = JSON.stringify(jsLines(runtimeSeries(cs.kind, candles, toJsParams(cs.params)))); }
            catch { baseline = null; }

            for (const variant of cs.variants) {
                compared += 1;
                const params = variantParams(cs, variant);

                // The platform refused this setting. The port has to refuse it too, or it is
                // drawing a line the terminal does not have -- and a refusal on our side is the
                // agreement, so it is caught here rather than ending the whole scan.
                if (variant.threw) {
                    let produced = 0;
                    try {
                        produced = jsLines(runtimeSeries(cs.kind, candles, params))
                            .reduce((n, line) => n + line.filter(numeric).length, 0);
                    } catch { continue; }
                    if (produced > 0) {
                        diverged.push(`${cs.kind} ${variantLabel(variant)}  the platform refused `
                            + `(${variant.threw}) but the port produced ${produced} values`);
                    }
                    continue;
                }

                let reason;
                // A throw where the platform produced a series is a divergence like any other, and
                // must not take the rest of the scan down with it.
                try { reason = compare(cs.kind, candles, params, variant); }
                catch (error) { reason = `threw: ${error.message}`; }

                // The platform moved and the port did not: it is not reading this parameter at all,
                // which no value comparison can show because both sides are then compared at their
                // own defaults.
                if (!reason && baseline !== null && csMoved(cs, variant)) {
                    let now;
                    try { now = JSON.stringify(jsLines(runtimeSeries(cs.kind, candles, params))); }
                    catch { now = null; }
                    if (now === baseline) {
                        reason = 'the platform answers differently at this setting and the port does not read it';
                    }
                }

                if (reason) diverged.push(`${cs.kind} ${variantLabel(variant)}  ${reason}`);
            }
        }

        console.log(`[parity-scan] matrix: ${covered} indicators, ${compared} runs, ${diverged.length} diverging`);
        assert.ok(compared > 300, `the matrix compared only ${compared} runs — the dump lost its variants`);
        assert.equal(diverged.length, 0,
            `${diverged.length} divergences at non-default lengths:\n` + diverged.join('\n'));
    });
});

describe('parity scan: candle shapes', () => {
    it('every indicator matches StockSharp on constant, gapped, spiked and degenerate series', (t) => {
        if (!requireDump(t, status)) return;

        const stress = readDump('stress.json');
        const diverged = [];
        const noFn = new Set();
        let compared = 0;

        for (const series of stress.series || []) {
            const candles = series.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
            for (const cs of series.indicators || []) {
                // "We never implemented it" is asked first: it is the more actionable of the two.
                if (!getIndicatorDefinition(cs.kind)) { noFn.add(cs.kind); continue; }

                // A platform side that is null on every bar is not a reason to hold anything back:
                // it is a comparison, and the port has to be silent there too. Nothing is excused
                // from the stress pass any more -- the old exclusion was one indicator by name.

                // The platform refused to compute this pair. The dumper used to drop such pairs
                // entirely, which meant the port could happily produce a line where StockSharp
                // produces nothing and no test ever looked. Refusing too is the only match.
                if (cs.threw) {
                    compared += 1;
                    const produced = jsLines(runtimeSeries(cs.kind, candles, toJsParams(cs.params)))
                        .reduce((n, line) => n + line.filter(numeric).length, 0);
                    if (produced > 0) {
                        diverged.push(`${cs.kind}@${series.name}  the platform refused (${cs.threw}) `
                            + `but the port produced ${produced} values`);
                    }
                    continue;
                }

                compared += 1;
                const reason = compare(cs.kind, candles, toJsParams(cs.params), cs);
                if (reason) diverged.push(`${cs.kind}@${series.name}  ${reason}`);
            }
        }

        console.log(`[parity-scan] shapes: ${stress.series.length} series, ${compared} runs, ${diverged.length} diverging`);
        assert.ok(compared > 800, `the stress pass compared only ${compared} runs — the dump is short`);
        assertRecorded('stress-no-js-calc', [...noFn], 'stress indicators with no JS calc fn');
        assert.equal(diverged.length, 0,
            `${diverged.length} divergences on awkward candle shapes:\n` + diverged.join('\n'));
    });
});
