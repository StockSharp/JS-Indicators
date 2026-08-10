// Parity between the client indicator catalog (src/catalog.json) and the
// authoritative StockSharp indicators. The C# side is read LIVE at test time from the StockSharp
// .NET core: tools/csharp-catalog is a tiny dumper that references the StockSharp.Algo NuGet and
// prints the reflected indicator catalog (kind, pane, measure, output count, param keys/types/
// defaults) as JSON. No committed fixture, no dependency on any other repo.
//
// Hard assertions:
//   * every catalog param key is actually read by that indicator's calc fn (pure TS — always runs).
//   * every client indicator kind is a real StockSharp indicator (runs when the .NET dump is
//     available; skipped otherwise so the node-only suite still passes without the SDK).
//   * every parameter default matches the platform's, or is a named deliberate divergence.
// Informational (logged, not asserted — the client deliberately differs): pane / param-count deltas.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Named, because an escape inside a template literal is easy to mangle when this file is
// edited by a tool rather than by hand.
const NEWLINE = String.fromCharCode(10);
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { getClientCatalog } = require('../src/index.js');
const { loadDumpStatus, readDump, requireDump } = require('./csharp-dump.js');
const { assertRecorded } = require('./parity-exceptions.js');
const { runtimeSeries } = require('./runtime-series.js');

// C# parameter keys are PascalCase and the client reads them lower-case or camelCase, so both
// spellings go in.
function toJsParams(csParams) {
    const out = {};
    for (const [k, v] of Object.entries(csParams || {})) {
        out[k.toLowerCase()] = v;
        out[k.charAt(0).toLowerCase() + k.slice(1)] = v;
    }
    return out;
}

const indicatorsDir = join(__dirname, '..', '..', 'src', 'calc');

// The dump is still read live from .NET — no committed fixture — but it is produced once by
// tools/parity-dump.mjs before node:test starts, not by this file racing the other parity file
// over the same build. `status.reason` names why it is absent when it is.
const status = loadDumpStatus();
const csharp = status.available ? readDump('catalog.json') : null;
const csByKind = new Map((csharp || []).map((e) => [e.kind.toLowerCase(), e]));

const catalog = getClientCatalog();

// The source of an indicator: its own file, plus the shared module of the family it came from,
// because a parameter can be read by a helper both of them use. One file per indicator is what
// makes this exact -- it used to scan a batch calc reached through a hand-written name map.
const sourceCache = {};
function indicatorSource(kind) {
    if (sourceCache[kind] !== undefined) return sourceCache[kind];
    let text = '';
    try { text = readFileSync(join(indicatorsDir, `${kind.toLowerCase()}.ts`), 'utf8'); } catch { return ''; }
    for (const m of text.matchAll(/from '\.\/shared\/([a-z-]+)\.js'/g)) {
        try { text += NEWLINE + readFileSync(join(indicatorsDir, 'shared', `${m[1]}.ts`), 'utf8'); } catch { /* none */ }
    }
    sourceCache[kind] = text;
    return text;
}

describe('indicator catalog parity with StockSharp', () => {
    it('lists a non-trivial catalog', () => {
        assert.ok(catalog.length > 120, `expected the full client catalog, got ${catalog.length}`);
    });

    it('every parameter an indicator declares is actually read by it', () => {
        const bad = [];
        for (const e of catalog) {
            const src = indicatorSource(e.id);
            if (!src) { bad.push(`${e.id}: no source file at src/calc/${e.id.toLowerCase()}.ts`); continue; }
            for (const p of e.params) {
                // A declared parameter nobody reads is a knob in the picker that does nothing.
                if (!new RegExp(`\\b${p.key}\\b`).test(src)) {
                    bad.push(`${e.id}: parameter '${p.key}' is declared but never read`);
                }
            }
        }
        assert.equal(bad.length, 0, 'parameters declared and not read:' + NEWLINE + bad.join(NEWLINE));
    });

    it('every client indicator kind exists in the StockSharp catalog', (t) => {
        requireDump(status);
        const missing = catalog.filter((e) => !csByKind.has(e.serverKind.toLowerCase()));
        assert.deepEqual(missing.map((e) => e.id), [],
            'client kinds absent from StockSharp: ' + missing.map((e) => e.id).join(', '));
    });

    it('every indicator sits where StockSharp puts it, with the parameters it exposes', (t) => {
        requireDump(status);
        const paneDiffs = [];
        const countDiffs = [];
        const nameDiffs = [];
        for (const e of catalog) {
            const cs = csByKind.get(e.serverKind.toLowerCase());
            if (!cs) continue;
            const csPane = cs.pane === 'main' ? 'overlay' : 'separate';
            if (e.pane !== csPane) paneDiffs.push(e.id);
            const csKnobCount = new Set((cs.params || []).map((p) => p.group || p.key)).size;
            if (e.params.length !== csKnobCount) countDiffs.push(e.id);

            // Counting them says nothing about which ones they are: an indicator can expose the
            // right number under the wrong names and every value comparison still passes, because
            // the parameters it was fed came from the platform in the first place -- handed over
            // by key, so a key we spell differently is never set and the indicator quietly runs on
            // its own default.
            //
            // Compared on the settings the platform puts on the indicator itself. A composite also
            // reaches the same setting through each inner line -- the platform's Aroon has an
            // Up.Length and a Down.Length behind the one Length a user sets -- and those are
            // aliases of a knob, not knobs of their own.
            // A knob answers to its own key and to every alias it declares -- the platform path a
            // saved chart would name it by.
            const spellings = e.params.map((p) => (
                [p.key, ...(p.aliases || [])].map((k) => k.toLowerCase())
            ));
            // One entry per setting the platform actually has. Several of its names can lead to
            // one knob -- a PPO's ShortPeriod is its short EMA's Length -- and the dump says which
            // by grouping the names that move together, so a knob is counted and demanded once.
            const byGroup = new Map();
            for (const p of cs.params || []) {
                const key = (p.group || p.key).toLowerCase();
                if (!byGroup.has(key)) byGroup.set(key, []);
                byGroup.get(key).push(p.key.toLowerCase());
            }
            const outer = [...byGroup.keys()];
            const all = [...byGroup.values()].flat();

            // Two questions, and they are not the same one. A knob we expose that the platform
            // does not have is one a user can turn to no effect; a knob the platform puts on the
            // indicator itself and we do not expose is one they cannot turn at all. Reaching a
            // platform setting through an inner line is fine either way -- the Alligator's shifts
            // live on Jaw, Teeth and Lips and we surface them flattened -- so an inner name counts
            // as the platform having it, but not as an obligation to expose it.
            //
            // A platform name also carries the path it is reached by: Acceleration's short period
            // is AoShortMaLength, because it sits on the Awesome Oscillator the Acceleration
            // holds, and we flatten that away. So a platform name may be claimed by the knob it
            // ends with -- but only by one of them, and only once. Matching every suffix freely
            // would let our single `length` answer for the platform's Length AND its DxLength, and
            // the second knob would look present while nothing can set it.
            const takenByUs = new Set();
            const takenByThem = new Set();
            const claim = (test) => {
                for (let round = 0; round < 2; round += 1) {
                    for (let i = 0; i < spellings.length; i += 1) {
                        if (takenByUs.has(i)) continue;
                        for (let j = 0; j < all.length; j += 1) {
                            if (takenByThem.has(j)) continue;
                            if (!spellings[i].some((k) => test(all[j], k))) continue;
                            takenByUs.add(i);
                            takenByThem.add(j);
                            break;
                        }
                    }
                    // Exact spellings settle first, then the leftovers may match by path.
                    test = (theirs, ours) => theirs.endsWith(ours);
                }
            };
            claim((theirs, ours) => theirs === ours);

            const invented = e.params.filter((_, i) => !takenByUs.has(i)).map((p) => p.key.toLowerCase());
            // A group is missing when none of its names was claimed by a knob of ours.
            const missing = [...byGroup.entries()]
                .filter(([, names]) => names.every((n) => !takenByThem.has(all.indexOf(n))))
                .map(([key]) => key);
            if (invented.length || missing.length) {
                const parts = [];
                if (invented.length) parts.push(`exposes [${invented.join(', ')}] which the platform does not have`);
                if (missing.length) parts.push(`does not expose [${missing.join(', ')}] which the platform puts on it`);
                nameDiffs.push(`${e.id}: ${parts.join('; ')}`);
            }
        }
        if (paneDiffs.length) console.log(`[parity] pane deltas (${paneDiffs.length}): ` + paneDiffs.join(', '));
        if (countDiffs.length) console.log(`[parity] param-count deltas (${countDiffs.length}): ` + countDiffs.join(', '));

        // A difference from the platform is a failure, not a fact to be filed. The client and the
        // terminal draw the same indicator, and somebody who adds it in both places has to get the
        // same picture -- so there is nothing here to record, only to fix.
        assert.deepEqual(paneDiffs, [],
            `${paneDiffs.length} indicators sit on a different pane than StockSharp: ` + paneDiffs.join(', '));
        assert.deepEqual(nameDiffs, [],
            `${nameDiffs.length} indicators name their parameters differently than StockSharp:` + NEWLINE
            + nameDiffs.join(NEWLINE));
        assert.deepEqual(countDiffs, [],
            `${countDiffs.length} indicators expose a different number of parameters than StockSharp: `
            + countDiffs.join(', '));
    });

    // Counting parameters says nothing about their values, and the numeric parity suite feeds the
    // PLATFORM's parameters into the client calc -- so a client default that disagrees with the
    // platform is invisible to every other check here. A user adding the indicator on the site and
    // on the terminal gets two different lines, and nothing says so.
    it('every indicator measures the same thing StockSharp says it measures', (t) => {
        requireDump(status);
        // The measure is what a chart scales a pane by -- a percentage runs 0..100, a correlation
        // -1..+1, a volume neither. Getting it wrong puts an indicator on a scale that hides it,
        // and nothing in a value comparison notices, because the numbers are right either way.
        const MEASURES = { price: 'Price', percent: 'Percent', volume: 'Volume', 'minus-one-plus-one': 'MinusOnePlusOne' };
        const drifted = [];
        for (const e of catalog) {
            const cs = csByKind.get(e.serverKind.toLowerCase());
            if (!cs) continue;
            const ours = MEASURES[e.measure];
            if (ours === undefined) {
                drifted.push(`${e.id}: measures '${e.measure}', which the platform has no name for`);
            } else if (ours !== cs.measure) {
                drifted.push(`${e.id}: client ${e.measure}, platform ${cs.measure}`);
            }
        }
        assert.deepEqual(drifted, [],
            `${drifted.length} indicators measure something other than what StockSharp says:` + NEWLINE
            + drifted.join(NEWLINE));
    });

    it('every indicator needs as many bars to form as StockSharp says it needs', (t) => {
        requireDump(status);
        // The platform states its warm-up: NumValuesToInitialize, which several indicators
        // override -- an Alligator defers to its jaw, a shifted line adds its shift. Ours states
        // nothing, so this asks the observable form of the same thing: the bar its first value
        // appears on. An indicator that warms up for longer than the platform silently drops the
        // opening of every chart it is added to.
        const dump = readDump('values.json');
        const bars = dump.input.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
        const drifted = [];

        for (const cs of dump.indicators) {
            const row = csByKind.get(cs.kind.toLowerCase());
            if (!row || !(row.warmUp > 0)) continue;
            const platformFirst = (cs.values || []).findIndex((v) => v !== null && v !== undefined);
            if (platformFirst < 0) continue;

            let series;
            try { series = runtimeSeries(cs.kind, bars, toJsParams(cs.params)); }
            catch { continue; }
            if (!series) continue;
            const line = Array.isArray(series) ? series : series[Object.keys(series)[0]];
            const ourFirst = line.findIndex((p) => p && typeof p.value === 'number' && Number.isFinite(p.value));

            if (ourFirst !== platformFirst) {
                drifted.push(`${cs.kind}: first value on bar ${ourFirst}, platform on ${platformFirst}`
                    + ` (it declares ${row.warmUp} values to initialise)`);
            }
        }

        assert.deepEqual(drifted, [],
            `${drifted.length} indicators start drawing on a different bar than StockSharp:` + NEWLINE
            + drifted.join(NEWLINE));
    });

    it('every parameter default matches StockSharp', (t) => {
        requireDump(status);
        const drifted = [];
        const detail = [];
        for (const e of catalog) {
            const cs = csByKind.get(e.serverKind.toLowerCase());
            if (!cs) continue;
            const csDefaults = new Map((cs.params || []).map((p) => [p.key.toLowerCase(), p.def]));
            const differing = [];
            for (const p of e.params || []) {
                if (!csDefaults.has(p.key.toLowerCase())) continue;   // param counts are the other test's job
                const csDef = csDefaults.get(p.key.toLowerCase());
                if (csDef === null || csDef === undefined) continue;  // the platform exposes no default
                if (Number(p.default) !== Number(csDef)) differing.push(`${p.key} client=${p.default} cs=${csDef}`);
            }
            if (differing.length) {
                drifted.push(e.id);
                detail.push(`${e.id}: ${differing.join(', ')}`);
            }
        }
        if (detail.length) console.log('[parity] default deltas:\n  ' + detail.join('\n  '));
        // Same rule, and this is the divergence that shows: a default that disagrees means the
        // same indicator draws a different line here than it does on the terminal.
        assert.deepEqual(drifted, [],
            `${drifted.length} indicators have a parameter default that disagrees with StockSharp:`
            + NEWLINE + '  ' + detail.join(NEWLINE + '  '));
    });
});
