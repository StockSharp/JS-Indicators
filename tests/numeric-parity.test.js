// Numeric parity: run the SAME deterministic candle series through BOTH the authoritative
// StockSharp C# indicator and the client JS calc port, and assert the per-bar outputs match.
//
// The C# side is read LIVE from tools/csharp-catalog run with `--values`: it builds a fixed
// deterministic OHLCV series, processes each indicator with its default params, and prints
//   { input: [{ t, o, h, l, c, v }, ...],
//     indicators: [{ kind, params, values: (number|null)[] }, ...] }
// (single-output indicators only for now; multi-output lines come later and are skipped here).
//
// tools/parity-dump.mjs runs that dumper once before node:test starts and caches the output;
// this file only reads the cache. The suite skips only for one of the three reasons that script
// detects on purpose (StockSharp checkout absent, dotnet missing, no SDK), and the reason is
// named in the skip message. A build that fails for any other cause fails `npm test`.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { runtimeSeries } = require('./runtime-series.js');
const { loadDumpStatus, readDump, requireDump } = require('./csharp-dump.js');
const { assertRecorded } = require('./parity-exceptions.js');
const { getIndicatorDefinition } = require('../src/index.js');

/// The platform ran it and produced no value on any bar -- which is what an indicator that is not
/// a series looks like from here. A runtime fact rather than a name, so a new one needs no entry.
function nonScalar(cs) {
    return Array.isArray(cs.values) && cs.values.every((v) => v === null || v === undefined);
}

// Relative + absolute tolerance for decimal (C#) vs double (JS).
// Decimal on the platform, double here, so the two cannot agree to the last bit. This is the size
// of that gap and nothing more: across every comparison in this suite the largest honest
// difference measured is ~1.4e-11, so 1e-9 leaves two orders of magnitude of headroom while
// refusing an arithmetic mistake. It used to be 1e-6, which on a price of 100 accepted an error of
// 1e-4 -- five orders of magnitude of cover for a real bug.
const TOL = 1e-9;

// Compare an observed set against an allow-list, failing on BOTH unexpected members and stale
// entries. Reported separately because the two mean opposite things: something new drifted in,
// versus something was fixed and the exemption should go.
function assertAllowList(observed, allowed, what) {
    const unexpected = observed.filter((k) => !(k in allowed));
    const stale = Object.keys(allowed).filter((k) => !observed.includes(k));
    const problems = [];
    if (unexpected.length) problems.push(`${what} NOT in the allow-list: ${unexpected.join(', ')}`);
    if (stale.length) problems.push(`${what} allow-list entries that no longer apply (remove them): ${stale.join(', ')}`);
    assert.equal(problems.length, 0, problems.join('\n'));
}

// The StockSharp per-bar values are read live from .NET — no committed fixture — but the dump is
// produced once by tools/parity-dump.mjs before node:test starts. This file no longer builds
// anything itself, so it cannot race the other parity file over the same project, and a build
// that genuinely fails now fails the suite instead of masquerading as "no dotnet SDK".
const status = loadDumpStatus();
const dump = { ran: status.available, data: status.available ? readDump('values.json') : null };

// C# param keys are PascalCase (`Length`); the client calc fns read lowercase (`length`).
// The single-`Length` subset maps by a plain lower-case fold.
function toJsParams(csParams) {
    // C# param keys are PascalCase (`Length`, `MomentumPeriod`); the client calc fns
    // read either lower-case (`length`) or camelCase (`momentumPeriod`), so set both.
    const p = {};
    for (const k of Object.keys(csParams || {})) {
        const v = csParams[k];
        p[k.toLowerCase()] = v;
        p[k.charAt(0).toLowerCase() + k.slice(1)] = v;
    }
    return p;
}

function numeric(x) {
    return x !== null && x !== undefined && Number.isFinite(x);
}

// Both formed and within tolerance, OR both not-formed (null/absent).
function close(js, cs) {
    if (!numeric(js) || !numeric(cs)) return !numeric(js) && !numeric(cs);
    return Math.abs(js - cs) <= TOL + TOL * Math.max(Math.abs(js), Math.abs(cs));
}

describe('numeric parity: JS calc vs StockSharp C#', () => {
    it('C# dumper provides a numeric --values dump (input + per-bar values)', (t) => {
        requireDump(status);
        assert.ok(dump.data && Array.isArray(dump.data.input) && dump.data.input.length > 30,
            'expected { input: [...] } with a non-trivial series from --values');
        assert.ok(Array.isArray(dump.data.indicators) && dump.data.indicators.some((e) => Array.isArray(e.values)),
            'expected { indicators: [{ kind, values: (number|null)[] }] } from --values');
    });

    it('single-output core indicators match StockSharp bar-for-bar', (t) => {
        requireDump(status);
        assert.ok(dump.data && Array.isArray(dump.data.input), 'no numeric dump (--values not implemented)');

        const candles = dump.data.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
        const byKind = new Map((dump.data.indicators || []).map((e) => [e.kind, e]));
        const failures = [];

        // Every kind the platform dumped, rather than a hand-picked core: the list this replaced
        // named six, and the six were the ones nobody worried about.
        for (const cs of dump.data.indicators) {
            const kind = cs.kind;
            if (!Array.isArray(cs.values)) continue;
            // Not implemented here is a recorded fact, not a mismatch: the exact-set assertion in
            // the scalar test below is what watches that list.
            if (!getIndicatorDefinition(kind)) continue;

            let jsOut = runtimeSeries(kind, candles, toJsParams(cs.params));
            // The platform exposes one scalar; ours is whichever line the definition declares
            // first, which is the indicator's own line. Derived, so a new multi-line indicator
            // needs no entry anywhere.
            if (jsOut && !Array.isArray(jsOut)) {
                const definition = getIndicatorDefinition(kind);
                if (definition) jsOut = jsOut[definition.outputs[0].id];
            }
            if (!Array.isArray(jsOut) || jsOut.length !== cs.values.length) {
                failures.push(`${kind}: length js=${jsOut && jsOut.length} cs=${cs.values.length}`);
                continue;
            }
            for (let i = 0; i < cs.values.length; i++) {
                const jsv = jsOut[i] ? jsOut[i].value : null;
                if (!close(jsv, cs.values[i])) failures.push(`${kind}[${i}]: js=${jsv} cs=${cs.values[i]}`);
            }
        }
        assert.equal(failures.length, 0, 'numeric parity mismatches:\n' + failures.slice(0, 40).join('\n'));
    });

    // The chart redraws the last (forming) candle as it changes; StockSharp models this by processing
    // a non-final value that never commits. For each perturbed forming bar the JS port — re-running its
    // calc over series + that bar — must land on the same preview the C# indicator yields non-finally.
    it('single-output core indicators match StockSharp on a changing (non-final) last candle', (t) => {
        requireDump(status);
        assert.ok(dump.data && Array.isArray(dump.data.probes) && dump.data.probes.length > 0,
            'expected { probes: [...] } from --values for the changing-candle check');

        const base = dump.data.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
        const byKind = new Map((dump.data.indicators || []).map((e) => [e.kind, e]));
        const failures = [];

        // Every kind the dump carries previews for, not a hand-picked handful: the platform
        // records them for 126 indicators and this used to check six of them.
        for (const cs of dump.data.indicators) {
            const kind = cs.kind;
            if (!Array.isArray(cs.previews)) continue;
            const definition = getIndicatorDefinition(kind);
            if (!definition) continue;

            for (let pi = 0; pi < dump.data.probes.length; pi++) {
                const p = dump.data.probes[pi];
                const candles = base.concat([{ time: base.length, open: p.o, high: p.h, low: p.l, close: p.c, volume: p.v }]);
                // The platform made these numbers with IsFinal=false, so the probe goes in as a
                // preview here too. Appending it as a closed candle compared an open bar against a
                // finished one and called the difference parity.
                let jsOut = runtimeSeries(kind, candles, toJsParams(cs.params), true);
                if (jsOut && !Array.isArray(jsOut)) jsOut = jsOut[definition.outputs[0].id];
                const jsv = jsOut.length ? (jsOut[jsOut.length - 1] ? jsOut[jsOut.length - 1].value : null) : null;
                if (!close(jsv, cs.previews[pi])) failures.push(`${kind} probe#${pi} (Δclose=${(p.c - base[base.length - 1].close).toFixed(2)}): js=${jsv} cs=${cs.previews[pi]}`);
            }
        }
        assert.equal(failures.length, 0, 'changing-candle parity mismatches:\n' + failures.slice(0, 40).join('\n'));
    });

    // Full coverage: run EVERY scalar C# indicator (single-output, plus the primary line of the
    // multi-output ones) through its JS calc fn over the final series and assert none diverge.
    // This locks in the whole port against StockSharp; non-scalar indicators are excluded explicitly.
    it('every scalar indicator matches StockSharp bar-for-bar', (t) => {
        requireDump(status);
        const candles = dump.data.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
        const matched = [];
        const diverged = [];
        const noFn = [];
        const excluded = [];
        for (const cs of dump.data.indicators || []) {
            if (!Array.isArray(cs.values)) continue; // complex / multi-output: handled later
            // "We never implemented it" is asked first: it is the more actionable of the two, and
            // an unported indicator whose C# side happens to be null everywhere would otherwise be
            // filed as merely uncomparable.
            if (!getIndicatorDefinition(cs.kind)) { noFn.push(cs.kind); continue; }
            if (nonScalar(cs)) { excluded.push(cs.kind); continue; }
            let jsOut;
            try { jsOut = runtimeSeries(cs.kind, candles, toJsParams(cs.params)); }
            catch { diverged.push(cs.kind + '(threw)'); continue; }
            // The platform exposes one scalar; ours is whichever line the definition declares first,
            // which is what a chart calls the indicator's own line. Derived, so a new multi-line
            // indicator needs no entry anywhere.
            if (jsOut && !Array.isArray(jsOut)) {
                const primary = getIndicatorDefinition(cs.kind);
                if (primary) jsOut = jsOut[primary.outputs[0].id];
            }
            if (!Array.isArray(jsOut) || jsOut.length !== cs.values.length) { diverged.push(cs.kind + '(shape)'); continue; }
            const csFormed = cs.values.findIndex((v) => v !== null && v !== undefined);
            let firstMism = -1;
            let postFormedMism = -1;
            for (let i = 0; i < cs.values.length; i++) {
                const jsv = jsOut[i] ? jsOut[i].value : null;
                if (!close(jsv, cs.values[i])) {
                    if (firstMism < 0) firstMism = i;
                    if (csFormed >= 0 && i >= csFormed && postFormedMism < 0) postFormedMism = i;
                }
            }
            if (firstMism < 0) { matched.push(cs.kind); continue; }
            if (csFormed >= 0 && postFormedMism < 0) {
                diverged.push(`${cs.kind} [WARMUP-ONLY csFormed@${csFormed}]`);
            } else {
                const at = postFormedMism < 0 ? firstMism : postFormedMism;
                const smp = [];
                for (let j = at; j < Math.min(at + 3, cs.values.length); j++) {
                    const jv = jsOut[j] ? jsOut[j].value : null;
                    smp.push(`[${j}]js=${jv} cs=${cs.values[j]}`);
                }
                diverged.push(`${cs.kind} [DRIFT csFormed@${csFormed}] ${smp.join('  ')}`);
            }
        }
        console.log(`[numeric-parity] scalar coverage: ${matched.length} match, ${diverged.length} diverge, ${noFn.length} no-js-fn, ${excluded.length} non-scalar`);
        if (noFn.length) console.log('[numeric-parity] no-js-fn:', noFn.join(', '));
        assert.equal(diverged.length, 0, 'indicators diverging from the C# dump:\n' + diverged.join('\n'));
        // Everything skipped above has to be skipped ON PURPOSE. Without this the two `continue`
        // branches are a silent hole: a StockSharp indicator we never ported, or one whose calc
        // stopped resolving, would just shrink the "match" count.
        assertRecorded('scalar-no-js-calc', noFn, 'scalar indicators with no JS calc fn');
        assertRecorded('scalar-non-scalar', excluded, 'scalar indicators excluded');
    });

    // Multi-line (complex) indicators: the C# dump carries one value array per inner indicator.
    // The JS calc returns an object of named line arrays. Auto-match each C# line to whichever JS
    // line reproduces it bar-for-bar, so field-name differences don't matter; every C# line must
    // be reproduced by some JS line.
    it('every complex indicator line matches StockSharp bar-for-bar', (t) => {
        requireDump(status);
        const candles = dump.data.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));

        const asLine = (arr) => arr.map((p) => (p && typeof p === 'object' && !Array.isArray(p)) ? p.value : p);
        const jsLines = (jsOut) => {
            const lines = [];
            const push = (name, arr) => {
                if (!Array.isArray(arr) || arr.length === 0) return;
                if (Array.isArray(arr[0])) arr.forEach((sub, i) => push(name + i, sub)); // ribbon: array of series
                else lines.push({ field: name, values: asLine(arr) });
            };
            if (!jsOut) return lines;
            if (Array.isArray(jsOut)) push('(default)', jsOut);
            else for (const k of Object.keys(jsOut)) push(k, jsOut[k]);
            return lines;
        };
        const lineMatch = (a, b) => a.length === b.length && b.every((v, i) => close(a[i], v));

        const matched = [];
        const diverged = [];
        const noFn = [];
        for (const cs of dump.data.indicators || []) {
            if (!Array.isArray(cs.lines)) continue;
            if (!getIndicatorDefinition(cs.kind)) { noFn.push(cs.kind); continue; }
            let cand;
            try { cand = jsLines(runtimeSeries(cs.kind, candles, toJsParams(cs.params))); }
            catch (error) { diverged.push(`${cs.kind} (threw: ${error.message})`); continue; }
            const unmatched = [];
            for (let li = 0; li < cs.lines.length; li++) {
                if (!cand.some((jc) => lineMatch(jc.values, cs.lines[li]))) unmatched.push((cs.lineNames && cs.lineNames[li]) + '#' + li);
            }
            if (unmatched.length === 0) matched.push(cs.kind);
            else diverged.push(`${cs.kind} [unmatched: ${unmatched.join(', ')}]`);
        }
        console.log(`[numeric-parity] complex coverage: ${matched.length} match, ${diverged.length} diverge, ${noFn.length} no-js-fn`);
        if (matched.length) console.log('[numeric-parity] complex match:', matched.join(', '));
        if (diverged.length) console.log('[numeric-parity] complex diverge:', diverged.join('  |  '));
        if (noFn.length) console.log('[numeric-parity] complex no-js-fn:', noFn.join(', '));
        assert.equal(diverged.length, 0, 'complex indicators diverging from the C# dump:\n' + diverged.join('\n'));
        assert.deepEqual(noFn, [], 'complex indicators with no JS calc fn: ' + noFn.join(', '));
    });
});
