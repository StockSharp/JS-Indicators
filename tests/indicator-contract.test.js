// What every indicator has to satisfy on its own, before anything is compared to StockSharp.
//
// This is the tier StockSharp's own Tests/IndicatorTests.cs runs first, and the one this port did
// not have at all. Its NumValuesToInitialize, StateNonFinalInput and NonFinalValueChanges need no
// reference data: they ask whether an indicator is self-consistent, and an indicator that is not
// cannot be made right by matching numbers on one smooth series.
//
// The unfinished-candle path is the reason this matters here. A chart feeds the forming bar over
// and over as the price moves, then feeds it once more as final. Every one of those non-final
// calls goes through the same processor as the committed ones, and nothing in this repository
// checked that they leave it alone. A processor that folds a preview into its running sum is
// wrong by exactly the number of ticks that arrived, which is invisible in any test that only
// replays finished candles -- which is every other test we have.
//
// Failures are collected across all indicators and reported together, the way the C# suite does
// it: one red test naming twenty indicators is a morning's work, twenty runs to find them is a
// week's.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { IndicatorRuntime, getIndicatorDefinitions } = require('../src/index.js');

// A series with a bit of everything an indicator reads: a trend, turns, a spread that varies, and
// volume that is neither constant nor zero. Long enough for a default warm-up to complete.
function bars(count = 120) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const close = 100 + Math.sin(i / 5) * 6 + Math.cos(i / 11) * 2.5 + i * 0.07;
        const spread = 0.6 + Math.abs(Math.sin(i / 3)) * 0.9;
        out.push({
            time: 1_700_000_000 + i * 60,
            open: close - spread / 3,
            high: close + spread,
            low: close - spread,
            close,
            volume: 800 + ((i * 37) % 400),
        });
    }
    return out;
}

const SERIES = bars();

/// How many bars this indicator needs before it can be expected to have drawn anything: twice its
/// longest period, plus room for a shift and for the averages a composite stacks on one another.
function enoughBarsFor(definition) {
    const periods = definition.parameters
        .filter((p) => p.type === 'integer' && typeof p.defaultValue === 'number')
        .map((p) => p.defaultValue);
    return Math.max(120, 2 * Math.max(0, ...periods) + 60);
}

/// Every output of a runtime, flattened to one comparable array. Points carry both the bar they
/// came from and the bar they are drawn on, and a shifted output differs in the second alone, so
/// both belong in the comparison.
function snapshot(runtime, definition) {
    const out = [];
    for (const output of definition.outputs) {
        for (const p of runtime.points(output.id)) {
            out.push(`${output.id}@${p.sourceIndex}->${p.targetIndex}=${p.value}`);
        }
    }
    return out;
}

function build(definition) {
    const parameters = {};
    for (const p of definition.parameters || []) parameters[p.id] = p.defaultValue;
    return new IndicatorRuntime({ definition, parameters });
}

function feedFinal(definition, series) {
    const runtime = build(definition);
    for (const bar of series) runtime.update({ time: bar.time, value: bar }, true);
    return runtime;
}

const definitions = getIndicatorDefinitions();

describe('indicator contract: the same bars give the same line', () => {
    it('every indicator is deterministic over the same series', () => {
        const broken = [];

        for (const definition of definitions) {
            try {
                const first = snapshot(feedFinal(definition, SERIES), definition);
                const second = snapshot(feedFinal(definition, SERIES), definition);
                if (first.join('|') !== second.join('|')) broken.push(definition.id);
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
            }
        }

        assert.deepEqual(broken, [], `${broken.length} indicators are not deterministic:\n` + broken.join('\n'));
    });

    it('one bar at a time gives what all the bars at once give', () => {
        const broken = [];

        for (const definition of definitions) {
            try {
                const stepwise = feedFinal(definition, SERIES);

                const bulk = build(definition);
                bulk.reset(SERIES.map((bar) => ({ time: bar.time, value: bar })));

                const a = snapshot(stepwise, definition);
                const b = snapshot(bulk, definition);
                if (a.join('|') !== b.join('|')) {
                    const at = a.findIndex((v, i) => v !== b[i]);
                    broken.push(`${definition.id}: ${a.length} points stepwise vs ${b.length} bulk`
                        + (at >= 0 ? `, first difference ${a[at]} vs ${b[at]}` : ''));
                }
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
            }
        }

        // A chart loads its history in one go and then receives bars one at a time, so the two
        // paths through the same processor have to end up in the same place. This used to be
        // asked per family, in tables that named 250 indicators between them and compared against
        // the batch calc; it is the same question for every indicator, so it is asked once.
        assert.deepEqual(broken, [],
            `${broken.length} indicators end up somewhere else when fed bar by bar:\n` + broken.join('\n'));
    });

    it('every indicator emits finite numbers or nothing at all', () => {
        const broken = [];

        for (const definition of definitions) {
            let runtime;
            try {
                runtime = feedFinal(definition, SERIES);
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
                continue;
            }
            for (const output of definition.outputs) {
                for (const p of runtime.points(output.id)) {
                    if (typeof p.value !== 'number' || !Number.isFinite(p.value)) {
                        broken.push(`${definition.id}.${output.id} bar ${p.sourceIndex}: ${p.value}`);
                        break;
                    }
                }
            }
        }

        assert.deepEqual(broken, [], `${broken.length} indicators emit a value that is not a number:\n` + broken.join('\n'));
    });

    it('every indicator produces a line at all, on a series this ordinary', () => {
        const silent = [];

        for (const definition of definitions) {
            let runtime;
            let series;
            try {
                series = bars(enoughBarsFor(definition));
                runtime = feedFinal(definition, series);
            } catch (error) {
                silent.push(`${definition.id}: threw ${error.message}`);
                continue;
            }
            const total = definition.outputs.reduce((n, o) => n + runtime.points(o.id).length, 0);
            // Long enough for this indicator's own warm-up, so drawing nothing here means drawing
            // nothing anywhere. A fixed length assumed no indicator waits longer than it, which
            // the Market Meanness Index does: its default period alone is 200 bars.
            if (total === 0) silent.push(`${definition.id} over ${series.length} bars`);
        }

        assert.deepEqual(silent, [], `${silent.length} indicators drew nothing over 120 bars:\n` + silent.join('\n'));
    });
});

describe('indicator contract: the forming candle', () => {
    it('a preview leaves the committed line exactly as it was', () => {
        const broken = [];

        for (const definition of definitions) {
            try {
                // One runtime sees only finished candles. The other sees the same candles, but each
                // one arrives twice as a preview first -- once well below the eventual close and
                // once well above it -- exactly as a forming bar does on a live chart.
                const plain = feedFinal(definition, SERIES);
                const previewed = build(definition);
                for (const bar of SERIES) {
                    const input = { time: bar.time, value: bar };
                    previewed.update({ time: bar.time, value: { ...bar, close: bar.low, high: bar.close } }, false);
                    previewed.update({ time: bar.time, value: { ...bar, close: bar.high, low: bar.close } }, false);
                    previewed.update(input, true);
                }

                const before = snapshot(plain, definition).join('|');
                const after = snapshot(previewed, definition).join('|');
                if (before !== after) {
                    const a = snapshot(plain, definition);
                    const b = snapshot(previewed, definition);
                    const at = a.findIndex((v, i) => v !== b[i]);
                    broken.push(`${definition.id}: ${a.length} points vs ${b.length}`
                        + (at >= 0 ? `, first difference ${a[at]} vs ${b[at]}` : ''));
                }
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
            }
        }

        assert.deepEqual(broken, [],
            `${broken.length} indicators keep something from a preview in their committed line:\n` + broken.join('\n'));
    });

    it('successive previews reproduce independent previews', () => {
        const broken = [];

        // Two last bars as different as a bar can be: both ends of the range and the volume.
        const history = SERIES.slice(0, SERIES.length - 1);
        const live = SERIES[SERIES.length - 1];
        const down = { time: live.time, open: live.open, high: live.close, low: live.low - 25, close: live.low - 25, volume: 1 };
        const up = { time: live.time, open: live.open, high: live.high + 25, low: live.close, close: live.high + 25, volume: 90_000 };

        for (const definition of definitions) {
            try {
                const independent = (bar) => {
                    const runtime = build(definition);
                    for (const b of history) runtime.update({ time: b.time, value: b }, true);
                    runtime.update({ time: bar.time, value: bar }, false);
                    return snapshot(runtime, definition).join('|');
                };

                const runtime = build(definition);
                for (const b of history) runtime.update({ time: b.time, value: b }, true);
                runtime.update({ time: live.time, value: down }, false);
                const previewDown = snapshot(runtime, definition).join('|');
                runtime.update({ time: live.time, value: up }, false);
                const previewUp = snapshot(runtime, definition).join('|');

                if (previewDown !== independent(down) || previewUp !== independent(up))
                    broken.push(definition.id);
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
            }
        }

        assert.deepEqual(broken, [],
            `${broken.length} indicators let one preview affect the next:\n`
            + broken.join('\n'));
    });

    it('discarding a preview puts the line back', () => {
        const broken = [];

        for (const definition of definitions) {
            try {
                const runtime = build(definition);
                for (const bar of SERIES) runtime.update({ time: bar.time, value: bar }, true);
                const before = snapshot(runtime, definition).join('|');

                const next = SERIES[SERIES.length - 1];
                runtime.update({ time: next.time + 60, value: { ...next, time: next.time + 60, close: next.close * 1.2 } }, false);
                runtime.discardPreview();

                if (snapshot(runtime, definition).join('|') !== before) broken.push(definition.id);
            } catch (error) {
                broken.push(`${definition.id}: threw ${error.message}`);
            }
        }

        assert.deepEqual(broken, [],
            `${broken.length} indicators do not come back from a discarded preview:\n` + broken.join('\n'));
    });
});
