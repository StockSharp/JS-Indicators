// What every indicator owes the runtime that drives it, asked of all of them.
//
// A chart does more to an indicator than feed it closed candles. It previews the forming bar over
// and over, corrects a bar that arrived wrong, seeds a large history in one go and keeps only the
// tail, and restores from checkpoints while doing it. Each of those paths was tested -- against a
// stub processor in indicator-runtime.test.js, which proves the runtime's own bookkeeping and
// nothing about the 159 real processors it drives -- and then again in twelve per-family files,
// against a hand-written table of indicators.
//
// The properties are the same for every indicator, so they are asked once, of every registered
// definition. Failures are collected and reported together: one red test naming twenty indicators
// is a morning's work, twenty runs to find them is a week's.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { IndicatorRuntime, getIndicatorDefinitions, resolveIndicatorOutputs } = require('../src/index.js');

// Short on purpose: the per-prefix comparison is quadratic, and every property here is about the
// runtime's mechanics rather than about a long warm-up. Still long enough for the default
// parameters of everything in the catalogue to produce values.
function bars(count = 48, seed = 0) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const close = 100 + Math.sin((i + seed) / 4.3) * 7 + Math.cos((i + seed) / 9.1) * 2 + i * 0.06;
        const spread = 0.5 + Math.abs(Math.sin((i + seed) / 2.7)) * 1.1;
        out.push({
            time: 1_700_000_000 + i * 60,
            open: close - spread / 3,
            high: close + spread,
            low: close - spread,
            close,
            volume: 700 + ((i * 53) % 500),
        });
    }
    return out;
}

const SERIES = bars();
const input = (bar) => ({ time: bar.time, value: bar });

function defaults(definition) {
    const parameters = {};
    for (const p of definition.parameters || []) parameters[p.id] = p.defaultValue;
    return parameters;
}

const outputIds = (definition, parameters) =>
    resolveIndicatorOutputs(definition, parameters).map((output) => output.id);

/**
 * Everything a runtime is showing, as one comparable string.
 *
 * Both indices are in it because a shifted output differs from an unshifted one only in the second;
 * the time is in it because a point that names the wrong bar is wrong even with the right number;
 * and the metadata is in it because a handful of indicators answer with a direction rather than a
 * value, and nothing generic was looking at it.
 */
function snapshot(runtime, definition, parameters) {
    const out = [];
    for (const id of outputIds(definition, parameters)) {
        for (const p of runtime.points(id)) {
            out.push(`${id}@${p.sourceIndex}->${p.targetIndex}@${p.time}=${p.value}|${JSON.stringify(p.metadata ?? null)}`);
        }
    }
    return out.join('\n');
}

function build(definition, parameters, extra) {
    return new IndicatorRuntime({ definition, parameters, ...extra });
}

/// The same indicator handed the whole series at once -- the answer a step-by-step run has to reach.
function bulk(definition, parameters, series, extra) {
    const runtime = build(definition, parameters, extra);
    runtime.reset(series.map(input));
    return runtime;
}

const definitions = getIndicatorDefinitions();

/// Run `check` for every definition, collect what it says, and fail once with all of it.
function forEachDefinition(check, message) {
    const broken = [];
    for (const definition of definitions) {
        const parameters = defaults(definition);
        try {
            const reason = check(definition, parameters);
            if (reason) broken.push(`${definition.id}: ${reason}`);
        } catch (error) {
            broken.push(`${definition.id}: threw ${error.message}`);
        }
    }
    assert.deepEqual(broken, [], `${broken.length} ${message}:\n` + broken.join('\n'));
}

describe('runtime lifecycle: history', () => {
    it('every prefix of the series gives what that prefix gives in one go', () => {
        forEachDefinition((definition, parameters) => {
            const runtime = build(definition, parameters, { checkpointInterval: 8 });
            for (let i = 0; i < SERIES.length; i += 1) {
                runtime.update(input(SERIES[i]), true);
                // After each bar, not only at the end: a divergence that appears at a warm-up
                // boundary or at the oldest slot of a ring buffer and then heals is invisible to a
                // single comparison after the last bar.
                const stepwise = snapshot(runtime, definition, parameters);
                const atOnce = snapshot(bulk(definition, parameters, SERIES.slice(0, i + 1)), definition, parameters);
                if (stepwise !== atOnce) return `bar ${i}: fed one at a time it draws something else than all at once`;
            }
            return null;
        }, 'indicators draw a different line bar by bar than in one go');
    });

    it('the checkpoint interval is invisible in what is drawn', () => {
        forEachDefinition((definition, parameters) => {
            // Every other test builds runtimes with the default interval, which over a short series
            // means no processor's checkpoint() is ever captured or restored. A processor that
            // forgets a field in its checkpoint passes everything until a correction replays.
            const dense = snapshot(bulk(definition, parameters, SERIES, { checkpointInterval: 4 }), definition, parameters);
            const sparse = snapshot(bulk(definition, parameters, SERIES), definition, parameters);
            return dense === sparse ? null : 'checkpointing changes the line';
        }, 'indicators draw differently depending on how often they checkpoint');
    });

    it('a reset wipes whatever the runtime was holding', () => {
        const other = bars(31, 17);
        forEachDefinition((definition, parameters) => {
            const used = build(definition, parameters, { checkpointInterval: 8 });
            for (const bar of SERIES) used.update(input(bar), true);
            used.update({ time: SERIES[SERIES.length - 1].time + 60, value: SERIES[0] }, false);
            // A reset on a runtime that has been driven -- committed, previewed, checkpointed --
            // has to land where a runtime built a moment ago lands. Everywhere else in the suite
            // reset() is called on a virgin object, so nothing would notice state surviving it.
            used.reset(other.map(input));

            const fresh = snapshot(bulk(definition, parameters, other), definition, parameters);
            return snapshot(used, definition, parameters) === fresh ? null : 'a reused runtime resets to a different state than a new one';
        }, 'indicators keep something across a reset');
    });
});

describe('runtime lifecycle: the forming bar', () => {
    // Both ends of the range, both ends of the volume: an indicator that reads any field of a bar
    // has to answer differently to these, so none of them is silently untested.
    const probes = (last) => [
        { ...last, high: last.close, low: last.low - 12, close: last.low - 12, volume: 1 },
        { ...last, high: last.high + 12, low: last.close, close: last.high + 12, volume: 90_000 },
        { ...last, high: last.close, low: last.close, close: last.close, volume: 5_000 },
    ];

    it('committing a preview draws what a direct commit draws', () => {
        const history = SERIES.slice(0, SERIES.length - 1);
        forEachDefinition((definition, parameters) => {
            for (const probe of probes(SERIES[SERIES.length - 1])) {
                const runtime = build(definition, parameters, { checkpointInterval: 8 });
                for (const bar of history) runtime.update(input(bar), true);
                runtime.update(input(probe), false);
                runtime.update(input(probe), true);

                // StockSharp promises that a non-final input leaves state untouched. It does not
                // promise that the non-final value equals the final one: several windowed
                // indicators deliberately address a different buffer slot on those two paths.
                const afterPreview = snapshot(runtime, definition, parameters);
                const committed = snapshot(bulk(definition, parameters, [...history, probe]), definition, parameters);
                if (afterPreview !== committed) return 'previewing before commit changes the committed line';
            }
            return null;
        }, 'indicators retain preview state after the same bar is committed');
    });

    it('previews replace one another instead of piling up', () => {
        const history = SERIES.slice(0, SERIES.length - 1);
        const last = SERIES[SERIES.length - 1];
        forEachDefinition((definition, parameters) => {
            const runtime = build(definition, parameters, { checkpointInterval: 8 });
            for (const bar of history) runtime.update(input(bar), true);

            // No discardPreview between them, which is how ticks arrive: a processor that folds
            // each preview into its running state is wrong by however many ticks the bar got, and
            // the line still looks plausible.
            for (const probe of probes(last)) {
                runtime.update(input(probe), false);
                const independent = build(definition, parameters, { checkpointInterval: 8 });
                for (const bar of history) independent.update(input(bar), true);
                independent.update(input(probe), false);
                const expected = snapshot(independent, definition, parameters);
                if (snapshot(runtime, definition, parameters) !== expected) return 'consecutive previews accumulate';
            }
            return null;
        }, 'indicators accumulate their previews');
    });

    it('a preview does not count as a bar, and committing counts exactly one', () => {
        const history = SERIES.slice(0, SERIES.length - 1);
        const last = SERIES[SERIES.length - 1];
        forEachDefinition((definition, parameters) => {
            const runtime = build(definition, parameters);
            for (const bar of history) runtime.update(input(bar), true);

            runtime.update(input({ ...last, close: last.close * 1.05 }), false);
            if (runtime.committedCount !== history.length) {
                return `a preview moved committedCount to ${runtime.committedCount}, expected ${history.length}`;
            }
            runtime.update(input(last), true);
            if (runtime.committedCount !== history.length + 1) {
                return `committing moved committedCount to ${runtime.committedCount}, expected ${history.length + 1}`;
            }
            return null;
        }, 'indicators miscount their committed bars');
    });
});

describe('runtime lifecycle: where a value is drawn', () => {
    it('a shifted output lands exactly as far ahead as the indicator says', () => {
        forEachDefinition((definition, parameters) => {
            for (const id of outputIds(definition, parameters)) {
                // An output drawn away from the bar that produced it declares how far in a
                // parameter of its own -- jawShift, teethShift. The platform has no such concept:
                // its indicators emit at the bar they computed and the chart does the drawing, so
                // there is nothing in the dump to compare against and the shift has to be checked
                // against the declaration instead.
                const declared = definition.parameters || [];
                const runtime = bulk(definition, parameters, SERIES);
                const points = runtime.points(id);
                if (points.length === 0) continue;

                const distances = [...new Set(points.map((p) => p.targetIndex - p.sourceIndex))];
                const ahead = distances.filter((distance) => distance > 0);

                if (declared.length && ahead.length) {
                    // A declared shift is a fixed distance: the indicator says how far ahead, so
                    // every point of that output is drawn exactly that far ahead.
                    const wanted = new Set(declared.flatMap((parameter) => {
                        const value = parameters[parameter.id];
                        return typeof value === 'number' ? [value, value - 1] : [];
                    }));
                    if (ahead.some((distance) => !wanted.has(distance))) {
                        return `${id} is drawn ${ahead.join(', ')} bars ahead, which matches no declared parameter (or parameter minus one)`;
                    }
                    continue;
                }

                // Without a declared shift there are two honest shapes: drawn where it was
                // computed, or drawn back at a bar the indicator picked out -- a pivot, an
                // extremum -- which is behind by however far back that bar was. Ahead of its own
                // bar without saying so is neither.
                if (ahead.length) {
                    return `${id} is drawn ${ahead.join(', ')} bars ahead of its own bar without declaring a shift`;
                }
            }
            return null;
        }, 'indicators draw a shifted output somewhere other than where they say');
    });

    it('a forward-shifted output leaves its unresolved points past the end of the series', () => {
        forEachDefinition((definition, parameters) => {
            const runtime = bulk(definition, parameters, SERIES);
            for (const id of outputIds(definition, parameters)) {
                for (const p of runtime.points(id)) {
                    // Past the last bar there is no candle yet, so a point drawn there has no time.
                    // Inside the series it must have the time of the bar it is drawn on.
                    const beyond = p.targetIndex >= SERIES.length;
                    if (beyond && p.time !== null) return `${id} is drawn past the series at bar ${p.targetIndex} but claims a time`;
                    if (!beyond && p.time !== SERIES[p.targetIndex].time) {
                        return `${id} at bar ${p.targetIndex} claims time ${p.time}, the bar has ${SERIES[p.targetIndex].time}`;
                    }
                }
            }
            return null;
        }, 'indicators put a value on a bar that does not have that time');
    });
});

describe('runtime lifecycle: corrections and streaming', () => {
    it('correcting a bar in the past leaves the line the corrected series would have drawn', () => {
        const at = 12;   // far enough behind the tail that replay has to come off a checkpoint
        forEachDefinition((definition, parameters) => {
            const runtime = build(definition, parameters, { checkpointInterval: 8 });
            for (const bar of SERIES) runtime.update(input(bar), true);

            const fixed = { ...SERIES[at], high: SERIES[at].high + 4, close: SERIES[at].close + 3 };
            runtime.correct(at, input(fixed));

            const patched = SERIES.map((bar, i) => (i === at ? fixed : bar));
            // This is the only place a real processor's checkpoint() and restoreState() are put
            // through a round trip -- everywhere else they run against a stub.
            return snapshot(runtime, definition, parameters) === snapshot(bulk(definition, parameters, patched), definition, parameters)
                ? null : 'a correction leaves a different line than the corrected series draws';
        }, 'indicators replay a correction into the wrong line');
    });

    it('a streaming seed produces the whole line and reports what it kept', () => {
        const history = SERIES.slice(0, SERIES.length - 1);
        const next = SERIES[SERIES.length - 1];
        forEachDefinition((definition, parameters) => {
            const runtime = build(definition, parameters, { checkpointInterval: 8 });
            const points = runtime.resetStreaming(history.map(input), input(next));

            // The bounded-memory path a chart takes for a large history. Nothing generic drove it
            // before, so a definition that loses points here breaks the first paint and nothing
            // else notices.
            const expected = build(definition, parameters, { checkpointInterval: 8 });
            for (const bar of history) expected.update(input(bar), true);
            expected.update(input(next), false);
            const wanted = [];
            for (const id of outputIds(definition, parameters)) {
                for (const p of expected.points(id)) wanted.push(`${id}@${p.sourceIndex}->${p.targetIndex}@${p.time}=${p.value}`);
            }
            const got = points.map((p) => `${p.outputId}@${p.sourceIndex}->${p.targetIndex}@${p.time}=${p.value}`);
            if (got.length !== wanted.length) return `streamed ${got.length} points, a full run draws ${wanted.length}`;
            for (let i = 0; i < wanted.length; i += 1) {
                if (got[i] !== wanted[i]) return `streamed point ${i} is ${got[i]}, a full run has ${wanted[i]}`;
            }
            if (runtime.retainedFrom !== history.length) {
                return `retainedFrom is ${runtime.retainedFrom}, expected the seeded history length ${history.length}`;
            }
            if (runtime.hasPreview !== true) return 'a streaming seed with a preview does not report one';
            return null;
        }, 'indicators lose something when their history is seeded in one go');
    });
});
