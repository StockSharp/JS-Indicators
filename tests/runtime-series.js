// Run an indicator the way the chart runs it, and hand back what a calc function would have.
//
// Every parity pass used to get its "our side" from the batch calc in src/calc. The chart never
// calls those: the engine drives IndicatorRuntime for loaded history and for the forming bar
// alike, and says so in its own header -- the batch layer is a second opinion, not the thing on
// screen. So a suite built on it was checking the implementation nobody executes.
//
// The shape returned here is the shape the calc functions return, on purpose: one array of
// {time, value} for an indicator with a single output, an object keyed by output id for one with
// several. That way the comparisons against the platform dump need no changes at all -- only where
// the numbers come from changes.

import { IndicatorRuntime, getIndicatorDefinition } from '../src/index.js';

function drive(definition, parameters, candles, previewLast) {
    const runtime = new IndicatorRuntime({ definition, parameters });
    const lastIndex = candles.length - 1;

    for (let i = 0; i < candles.length; i += 1) {
        const bar = candles[i];
        // The platform records its previews from a bar processed with IsFinal=false, so the last
        // bar is fed the same way when a preview is what is being compared. Feeding it as final
        // would compare a closed candle against an open one.
        const isFinal = !(previewLast && i === lastIndex);
        runtime.update({ time: bar.time, value: bar }, isFinal);
    }
    return runtime;
}

/**
 * The indicator's lines over these candles, in the shape a calc function returns.
 *
 * `previewLast` feeds the final bar as a non-final update, which is what a forming candle is.
 * Returns null when the kind has no definition to drive.
 */
export function runtimeSeries(kind, candles, parameters, previewLast = false) {
    const definition = getIndicatorDefinition(kind);
    if (!definition) return null;

    const runtime = drive(definition, parameters, candles, previewLast);
    const lines = new Map();

    for (const output of runtime.outputs) {
        const line = new Array(candles.length);
        for (let i = 0; i < candles.length; i += 1) line[i] = { time: candles[i].time, value: null };
        for (const p of runtime.points(output.id)) {
            // Filed under the bar the platform reports it on, which is the later of the two --
            // and the two kinds of shift make that the same rule rather than two.
            //
            // A forward shift is baked into the number: AlligatorLine buffers its averages and
            // returns Buffer[0], so the value the platform reports on bar 20 is the average
            // computed on bar 12, and the later bar is where it is drawn. A backward shift is
            // metadata: ZigZag reports the extremum on the bar that confirms the reversal and
            // attaches a Shift saying how far back to draw it, so there the later bar is where it
            // was computed. Either way the platform speaks on the later bar, which is the bar the
            // value became known on.
            const at = Math.max(p.sourceIndex, p.targetIndex);
            if (at >= 0 && at < candles.length) {
                line[at] = { time: candles[at].time, value: p.value };
            }
        }
        lines.set(output.id, line);
    }

    if (lines.size === 1) return [...lines.values()][0];
    return Object.fromEntries(lines);
}

/**
 * The value each bar carries while it is still forming, for every bar in the series.
 *
 * `runtimeSeries(..., previewLast)` previews one bar and only ever the last, so the comparison it
 * feeds reaches a preview whose windows are already full. StockSharp's preview arithmetic differs
 * precisely while a buffer is filling -- its SMA answers `Buffer.SumNoFirst + value`, dropping a
 * sample the committed path keeps -- so those bars need their own oracle. Each bar is previewed and
 * then closed, which is the order a live chart produces them in.
 */
export function runtimeLivePreviews(kind, candles, parameters) {
    const definition = getIndicatorDefinition(kind);
    if (!definition) return null;

    const runtime = new IndicatorRuntime({ definition, parameters });
    const lines = new Map();
    for (const output of runtime.outputs) lines.set(output.id, new Array(candles.length).fill(null));

    for (let i = 0; i < candles.length; i += 1) {
        const bar = candles[i];
        const patch = runtime.update({ time: bar.time, value: bar }, false);
        // Read off the patch rather than re-scanning points(): the platform records one value per
        // Process call, and the patch is exactly that call's output. Scanning the whole point list
        // once per bar would also make this quadratic over a series this long.
        for (const op of patch.operations) {
            if (op.point === undefined || op.point.sourceIndex !== i) continue;
            const line = lines.get(op.outputId);
            if (line) line[i] = op.point.value;
        }
        runtime.update({ time: bar.time, value: bar }, true);
    }

    if (lines.size === 1) return [...lines.values()][0];
    return Object.fromEntries(lines);
}

/**
 * The oracle the incremental suites compare a step-by-step run against: the same indicator handed
 * the whole history at once.
 *
 * They used to compare against the batch calc in src/calc, which is gone -- and which was a second
 * copy of the same arithmetic rather than an authority. The property worth keeping was never "two
 * implementations agree" but "one bar at a time gives what all the bars at once give"; whether the
 * numbers themselves are right is settled against StockSharp in the parity suites.
 */
export function bulkOracle(kind, source, parameters, outputId) {
    const definition = typeof kind === 'string' ? getIndicatorDefinition(kind) : kind;
    if (!definition) return [];

    const runtime = new IndicatorRuntime({ definition, parameters });
    runtime.reset(source.map((bar) => ({ time: bar.time, value: bar })));

    return runtime.points(outputId || runtime.outputs[0].id)
        // metadata comes along: a point that carries a direction or a state is compared on that
        // too, and dropping it here would make the comparison quietly weaker than it looks.
        .map((point) => ({
            index: point.sourceIndex,
            time: point.time,
            value: point.value,
            metadata: point.metadata,
        }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

/**
 * The same oracle, keeping both indices and the time the runtime reports.
 *
 * For a shifted output -- a fractal drawn back at its middle bar, an Alligator line pushed
 * forward -- the two indices differ, and the suites used to rebuild them from a `shift` field the
 * batch calc exposed. The runtime states both directly, so rebuilding them is not a translation
 * but a second, different model laid over the first.
 */
export function bulkOracleWithTargets(kind, source, parameters, outputId) {
    const definition = typeof kind === 'string' ? getIndicatorDefinition(kind) : kind;
    if (!definition) return [];

    const runtime = new IndicatorRuntime({ definition, parameters });
    runtime.reset(source.map((bar) => ({ time: bar.time, value: bar })));

    return runtime.points(outputId || runtime.outputs[0].id)
        .map((point) => ({
            sourceIndex: point.sourceIndex,
            targetIndex: point.targetIndex,
            time: point.time,
            value: point.value,
            metadata: point.metadata,
        }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}
