// Dumps the StockSharp indicator catalog (kind, pane, measure, output count, param keys/types/
// defaults) to stdout as JSON. Referenced live by the Charts parity test — no committed fixture.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Linq;
using System.Text.Json;
using StockSharp.Algo;
using StockSharp.Algo.Indicators;
using StockSharp.Messages;

var excluded = new HashSet<string>
{
    "Id","Name","IsFormed","NumValuesToInitialize","Container","Source",
    "Measure","Style","Color","IsPreloaded","IsComplex","IsObsolete","Mode",
};

var provider = new IndicatorProvider();
provider.Init();

// Build the input the way the platform does. An indicator declares what it consumes through
// IndicatorInAttribute; BaseIndicator declares DecimalIndicatorValue, so anything that does not
// override it is handed the CLOSE, not the candle. Forcing a candle into such an indicator makes
// ToCandle() hand back that candle's own high/low and the dump silently agrees with a client that
// makes the same mistake. Mirrors Tests/IndicatorTests.cs in the StockSharp repo.
// DecimalIndicatorValue.IsFinal defaults to false, so it is always set explicitly here.
static IIndicatorValue MakeInput(IndicatorType type, IIndicator indicator, ICandleMessage candle, bool isFinal)
    => type.InputValue == typeof(DecimalIndicatorValue)
        ? new DecimalIndicatorValue(indicator, candle.ClosePrice, candle.OpenTime) { IsFinal = isFinal }
        : new CandleIndicatorValue(indicator, candle) { IsFinal = isFinal };

// One pass of an already-configured indicator over a series. Returns null when the indicator
// throws on this input: an indicator that refuses a degenerate series (a flat window, three bars,
// Length 1 on something that needs two) has no value to disagree about, and reporting that as a
// divergence would drown the real ones.
// A value the platform draws away from the bar that produced it says so through
// ShiftedIndicatorValue; everything else is drawn where it was computed.
static object ShiftOf(IIndicatorValue value)
    => value is ShiftedIndicatorValue shifted ? shifted.Shift : (object)0;

static Pass RunSeries(IndicatorType type, IIndicator indicator, List<TimeFrameCandleMessage> input)
{
    var inners = indicator is IComplexIndicator ci && ci.InnerIndicators.Count > 0 ? ci.InnerIndicators.ToList() : null;
    var values = new List<object>();
    var lines = new List<List<object>>();
    // How far ahead of its own bar the platform draws each value. Ichimoku's cloud and the
    // Alligator's jaw are shifted forward, and a dump that records only the number cannot say so --
    // which is why the client's shifts had to be checked by tests naming those indicators.
    var shifts = new List<List<object>>();
    if (inners is not null)
        for (var li = 0; li < inners.Count; li++) { lines.Add([]); shifts.Add([]); }
    else shifts.Add([]);

    try
    {
        foreach (var candle in input)
        {
            var res = indicator.Process(MakeInput(type, indicator, candle, true));
            if (inners is null)
            {
                values.Add(res.IsEmpty || !indicator.IsFormed ? null : res.GetValue<decimal>());
                shifts[0].Add(ShiftOf(res));
                continue;
            }

            var cv = res as IComplexIndicatorValue;
            for (var li = 0; li < inners.Count; li++)
            {
                object val = null;
                // Gate each line on its OWN inner indicator's IsFormed (not the outer's), so
                // per-line warm-up matches the client's independent per-line nulling.
                if (inners[li].IsFormed && cv is not null && cv.InnerValues.TryGetValue(inners[li], out var iv) && !iv.IsEmpty)
                {
                    try { val = iv.GetValue<decimal>(); } catch { }
                }
                lines[li].Add(val);
                shifts[li].Add(cv is not null && cv.InnerValues.TryGetValue(inners[li], out var sv) ? ShiftOf(sv) : null);
            }
        }
    }
    catch (Exception ex) { return new Pass { Threw = ex.GetType().Name + ": " + ex.Message }; }

    return inners is null
        ? new Pass { Values = values, Shifts = shifts }
        : new Pass { Lines = lines, LineNames = inners.ConvertAll(x => x.Name), Shifts = shifts };
}

// Run one indicator over the series once per matrix width, returning the per-width outputs a
// client calc has to reproduce.
static List<object> RunMatrix(IndicatorType type, List<TimeFrameCandleMessage> input, HashSet<string> excluded)
{
    // Every settable parameter, not just Length. The default alone hides every divergence that
    // lives at another setting, and Length alone hides two thirds of the surface: sixty-odd
    // indicators have no Length at all and were compared at their defaults and nowhere else, while
    // a composite's fast/slow/signal periods were never moved off theirs.
    var variants = new List<object>();

    // Driven off the same list ParamDict reports, so what the sweep can move and what the dump says
    // an indicator has are the same set by construction. That is what brings a composite in: the
    // Alligator's periods and shifts live on its inner lines, so before this it had no parameters
    // and no variants at all.
    IIndicator probe;
    try { probe = (IIndicator)Activator.CreateInstance(type.Indicator); }
    catch { return variants; }

    var sweepable = Knobs(probe, excluded);
    var sweepGroups = KnobGroups(type.Indicator, excluded, sweepable);

    foreach (var knob in sweepable)
    {
        // One sweep per setting, under the name the setting answers to first. The other names in
        // its group are paths to the same knob, and moving it by a path moves only the part of the
        // composite that path reaches -- an artefact of how the platform wires its inner lines,
        // not a configuration anybody picks.
        if (sweepGroups.TryGetValue(knob.Name, out var owner) && owner != knob.Name) continue;

        var values = SweepValues(
            Nullable.GetUnderlyingType(knob.Property.PropertyType) ?? knob.Property.PropertyType,
            knob.Inner);
        if (values is null) continue;

        foreach (var value in values)
        {
            IIndicator ind;
            try { ind = (IIndicator)Activator.CreateInstance(type.Indicator); }
            catch { break; }

            // The knob has to be found again on the fresh instance: the one Knobs() reported points
            // at the probe's inner line, not this one's.
            var target = Knobs(ind, excluded).FirstOrDefault(k => k.Name == knob.Name);
            if (target is null) break;

            // A setting the platform rejects is a result the client has to reproduce, so it is
            // recorded rather than skipped -- same rule as a series the platform throws on.
            try { target.Property.SetValue(target.Target, value); }
            catch (Exception ex)
            {
                var inner = ex is TargetInvocationException tie && tie.InnerException is not null ? tie.InnerException : ex;
                variants.Add(new { param = knob.Name, value, threw = inner.GetType().Name + ": " + inner.Message });
                continue;
            }

            var pass = RunSeries(type, ind, input);
            if (pass is null) continue;

            variants.Add(pass.Threw is not null
                ? new { param = knob.Name, value, threw = pass.Threw }
                : pass.Values is not null
                    ? (object)new { param = knob.Name, value, values = pass.Values }
                    : new { param = knob.Name, value, lines = pass.Lines });
        }
    }
    return variants;
}

// What to try for a parameter of this type. Ints get the degenerate ends and either side of the
// usual defaults; a bool has only two answers; a ratio gets a fraction, one and a multiple. Types
// with no meaningful sweep (a TimeSpan, an enum) return null and are left at their default.
// An inner knob gets a shorter sweep. A composite has one per inner line per property -- the Guppy
// has twenty-four -- and each variant carries a full pass over 1659 bars for every line the
// indicator draws, so the full width would multiply the dump into the hundreds of megabytes for no
// extra kind of answer: the degenerate ends are where the disagreements are.
static object[] SweepValues(Type type, bool narrow)
{
    if (type == typeof(int)) return narrow ? [1, 2] : [1, 2, 3, 6, 21];
    if (type == typeof(long)) return narrow ? [1L, 2L] : [1L, 2L, 3L, 6L, 21L];
    if (type == typeof(bool)) return [false, true];
    if (type == typeof(decimal)) return narrow ? [0.5m] : [0.5m, 1m, 2m];
    if (type == typeof(double)) return narrow ? [0.5d] : [0.5d, 1d, 2d];
    if (type == typeof(float)) return narrow ? [0.5f] : [0.5f, 1f, 2f];
    return null;
}

// The candle shapes the stress pass runs every indicator over. The smooth series the rest of the
// dump uses is well behaved by construction -- it never repeats a price, never gaps and never
// divides by zero -- so a port can be wrong about all three and still agree with the platform on
// every bar of it. Each shape below is one of those blind spots made explicit.
string[] stressShapes = ["constant", "rising", "falling", "spike", "gap", "alternating", "zerovolume", "tiny", "zeroprice", "downonly", "flatplateau", "ties", "steps"];

static List<TimeFrameCandleMessage> BuildSeries(string shape, int n)
{
    var t0 = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    var candles = new List<TimeFrameCandleMessage>();
    if (shape == "tiny") n = 3;

    for (var i = 0; i < n; i++)
    {
        decimal close, spread, volume = 1500m;
        switch (shape)
        {
            // A window where every price is identical. Anything that divides by (high - low) or by
            // a standard deviation meets a zero here, and the two sides have to agree on what that
            // means -- the platform answers null, several ports answer 0 or -100.
            case "constant":
                close = 100m; spread = 0m; break;
            case "rising":
                close = 100m + i * 0.5m; spread = 0.5m; break;
            case "falling":
                close = 200m - i * 0.5m; spread = 0.5m; break;
            // One bar three times the size of its neighbours: catches a recursive smoother that
            // never recovers and a range that is clamped on one side only.
            case "spike":
                close = 100m + (i == 40 ? 200m : 0m); spread = i == 40 ? 60m : 1m; break;
            // Every price zero. Anything that divides by a price, or by an average of prices,
            // meets a zero here rather than a small number -- which is the case a test naming one
            // indicator used to cover, one indicator at a time.
            case "zeroprice":
                close = 0m; spread = 0m; volume = 0m; break;
            // Never a single up move: an oscillator built from gains over losses has no gains at
            // all, so its numerator stays zero for the whole series.
            case "downonly":
                close = 200m - i * 1m; spread = 0.25m; break;
            // Moves, then stops dead for the rest of the series: a window that fills with real
            // variation and then collapses to no variation at all, which a series that is flat
            // from the first bar never exercises.
            case "flatplateau":
                close = i < 30 ? 100m + i * 2m : 158m; spread = i < 30 ? 1m : 0m; break;
            // The same handful of prices over and over, so the extreme of a window is repeatedly
            // tied. Which of the tied bars a rolling maximum evicts, and which it reports, is a
            // decision every windowed indicator makes and a series of distinct prices never asks
            // it to make.
            case "ties":
                close = 100m + (i % 4 == 0 ? 5m : i % 4 == 1 ? 5m : i % 4 == 2 ? 3m : 5m);
                spread = i % 4 == 3 ? 0m : 2m;
                break;
            // Flat runs with a jump between them: a window fills with one value, then with two,
            // and the oldest slot leaves at a moment a smooth series never produces.
            case "steps":
                close = 100m + (i / 7) * 10m; spread = i % 7 == 0 ? 3m : 0m; break;
            // A discontinuity mid-series, the shape a session break or a corporate action makes.
            case "gap":
                close = 100m + (i < 60 ? 0m : 50m) + i * 0.1m; spread = 1m; break;
            // Direction reverses every bar: nothing has a trend, and every up/down counter is
            // exercised at its maximum rate.
            case "alternating":
                close = 100m + (i % 2 == 0 ? 0m : 5m); spread = 1m; break;
            // Volume indicators divide by it, and a real feed does deliver zero-volume bars.
            case "zerovolume":
                close = Math.Round((decimal)(100.0 + 10.0 * Math.Sin(i / 7.0)), 2); spread = 1m; volume = 0m; break;
            // Fewer bars than any default window: everything is still warming up, so the whole
            // series is the warm-up behaviour the smooth run only sees the first few bars of.
            case "tiny":
                close = 100m + i; spread = 1m; break;
            default:
                throw new ArgumentOutOfRangeException(nameof(shape), shape, "unknown stress shape");
        }

        var open = i == 0 ? close : candles[i - 1].ClosePrice;
        var time = t0.AddMinutes(i);
        candles.Add(new TimeFrameCandleMessage
        {
            OpenTime = time,
            CloseTime = time,
            OpenPrice = open,
            HighPrice = Math.Max(open, close) + spread,
            LowPrice = Math.Min(open, close) - spread,
            ClosePrice = close,
            TotalVolume = volume,
            State = CandleStates.Finished,
        });
    }
    return candles;
}


/// Which knobs are the same knob. A composite reaches one setting by several paths -- a PPO's
/// ShortPeriod is its short EMA's Length, a Gator's two histograms share the alligator's lips --
/// and comparing path names cannot tell those apart from settings that are genuinely separate. So
/// ask the platform: move one knob on a fresh indicator, and every knob that moved with it is that
/// same knob under another name. Each group is named after its first member.
static Dictionary<string, string> KnobGroups(Type type, HashSet<string> excluded, List<Knob> reference)
{
    var group = new Dictionary<string, string>();
    foreach (var probed in reference)
    {
        if (group.ContainsKey(probed.Name)) continue;
        if ((Nullable.GetUnderlyingType(probed.Property.PropertyType) ?? probed.Property.PropertyType) != typeof(int))
        {
            group[probed.Name] = probed.Name;
            continue;
        }

        IIndicator fresh;
        try { fresh = (IIndicator)Activator.CreateInstance(type); }
        catch { group[probed.Name] = probed.Name; continue; }

        var knobs = Knobs(fresh, excluded);
        var before = Snapshot(knobs);
        var subject = knobs.FirstOrDefault(k => k.Name == probed.Name);
        if (subject is null) { group[probed.Name] = probed.Name; continue; }

        // A value no default is likely to already hold, so "did not move" means what it says.
        try { subject.Property.SetValue(subject.Target, 37); }
        catch { group[probed.Name] = probed.Name; continue; }

        var after = Snapshot(knobs);
        foreach (var k in knobs)
        {
            if (group.ContainsKey(k.Name)) continue;
            if (!before.TryGetValue(k.Name, out var was) || !after.TryGetValue(k.Name, out var now)) continue;
            if (Equals(was, now)) continue;
            group[k.Name] = probed.Name;
        }
        group[probed.Name] = probed.Name;
    }
    return group;
}

static Dictionary<string, object> Snapshot(List<Knob> knobs)
{
    var values = new Dictionary<string, object>();
    foreach (var k in knobs)
    {
        try { values[k.Name] = k.Property.GetValue(k.Target); } catch { }
    }
    return values;
}

// The settable numeric/bool properties that make up an indicator's parameter set, with the values
// the platform defaults them to. The client reads these back to drive its own calc with the same
// configuration, so the comparison is of arithmetic rather than of two different setups.
// Which properties actually configure an indicator, including the ones a composite keeps on its
// inner lines. The Alligator has no settable property of its own -- its three periods and three
// shifts live on Jaw, Teeth and Lips -- so reading only the outer object reported it as having no
// parameters at all, and the sweep had nothing to move.
//
// An inner property is named the way the client names it: the inner's own name, then the property,
// so Jaw.Shift is JawShift. Where the client happens to spell it differently the comparison fails
// loudly rather than skipping it, which is the right way round.
// Recursive, because holding goes deeper than one level: an Acceleration holds an Awesome
// Oscillator, which in turn holds the two moving averages whose periods are the thing a user
// actually sets. One level down reported the Acceleration as having a single SMA length.
static List<Knob> Knobs(IIndicator indicator, HashSet<string> excluded,
    string prefix = "", int depth = 0, bool inner = false)
{
    var knobs = new List<Knob>();
    if (depth > 3) return knobs;

    foreach (var p in indicator.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
    {
        if (p.GetSetMethod() is null || excluded.Contains(p.Name)) continue;
        if (!IsSettableNumber(p.PropertyType)) continue;
        knobs.Add(new Knob { Name = prefix + p.Name, Target = indicator, Property = p, Inner = inner });
    }

    // Every indicator this one holds, whatever it calls it and however it exposes it. A composite
    // lists them in InnerIndicators; a MACD simply has a LongMa and a ShortMa as get-only
    // properties and is not a composite at all -- so walking only InnerIndicators reported it as
    // having no parameters, when in truth it has two periods and a signal.
    foreach (var p in indicator.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
    {
        if (!typeof(IIndicator).IsAssignableFrom(p.PropertyType)) continue;
        if (SafeGet(p, indicator) is not IIndicator held) continue;

        foreach (var k in Knobs(held, excluded, prefix + p.Name, depth + 1, true))
            if (!knobs.Any(x => x.Name == k.Name)) knobs.Add(k);
    }
    return knobs;
}

static bool IsSettableNumber(Type type)
{
    var u = Nullable.GetUnderlyingType(type) ?? type;
    return u == typeof(int) || u == typeof(long) || u == typeof(decimal)
        || u == typeof(double) || u == typeof(float) || u == typeof(bool);
}

static object SafeGet(PropertyInfo property, object target)
{
    try { return property.GetValue(target); } catch { return null; }
}

static Dictionary<string, object> ParamDict(IndicatorType type, IIndicator indicator, HashSet<string> excluded)
{
    var pdict = new Dictionary<string, object>();
    foreach (var knob in Knobs(indicator, excluded))
    {
        try { pdict[knob.Name] = knob.Property.GetValue(knob.Target); } catch { }
    }
    return pdict;
}

// --stress mode: the same indicators at their default parameters, but over candle shapes chosen to
// be awkward rather than realistic -- see stressShapes. Emitted as its own dump, not folded into
// --values, so a failure reads as "SMA disagrees on a constant series" rather than as one more
// entry in a list of numbers.
if (args.Contains("--stress"))
{
    var seriesOut = new List<object>();
    foreach (var shape in stressShapes)
    {
        var input = BuildSeries(shape, 90);
        var inds = new List<object>();
        foreach (var e in provider.All)
        {
            if (e.Indicator is null || e.IsObsolete) continue;
            IIndicator ind;
            try { ind = (IIndicator)Activator.CreateInstance(e.Indicator); }
            catch { continue; }

            var pass = RunSeries(e, ind, input);
            if (pass is null) continue;

            var pdict = ParamDict(e, ind, excluded);
            inds.Add(pass.Threw is not null
                ? new { kind = e.Indicator.Name, @params = pdict, threw = pass.Threw }
                : pass.Values is not null
                    ? (object)new { kind = e.Indicator.Name, @params = pdict, values = pass.Values, shifts = pass.Shifts }
                    : new { kind = e.Indicator.Name, @params = pdict, lines = pass.Lines, lineNames = pass.LineNames, shifts = pass.Shifts });
        }

        seriesOut.Add(new
        {
            name = shape,
            input = input.ConvertAll(cd => new
            {
                t = new DateTimeOffset(cd.OpenTime).ToUnixTimeSeconds(),
                o = cd.OpenPrice,
                h = cd.HighPrice,
                l = cd.LowPrice,
                c = cd.ClosePrice,
                v = cd.TotalVolume,
            }),
            indicators = inds,
        });
    }

    Console.WriteLine(JsonSerializer.Serialize(new { series = seriesOut }, new JsonSerializerOptions { WriteIndented = false }));
    return;
}

// --values mode: run every single-output indicator (default params) over a fixed, deterministic
// OHLCV series and print { input, indicators:[{ kind, params, values:(number|null)[] }] } so the
// Charts numeric-parity test can compare the JS port bar-for-bar. The C# side is authoritative and
// read live; no committed fixture. Complex / multi-output indicators are emitted with complex:true
// and no values for now (their per-line dump lands later).
if (args.Contains("--values"))
{
    // The same 1659 bars of real market data StockSharp's own IndicatorTests pins its reference
    // files against. A generated series is smooth by construction -- it never repeats a price,
    // never gaps and never divides by zero -- so every degenerate case had to be either guessed at
    // in a stress shape or written up as a test naming one indicator. Real bars repeat, gap and go
    // flat on their own, which is why the platform needs no per-indicator tests at all.
    var t0 = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    var input = new List<TimeFrameCandleMessage>();
    var rowIndex = 0;
    foreach (var line in File.ReadLines(OhlcvPath(args)))
    {
        var parts = line.Trim().Split(',');
        if (parts.Length < 5) continue;
        var time = t0.AddMinutes(rowIndex++);
        input.Add(new TimeFrameCandleMessage
        {
            OpenTime = time,
            CloseTime = time,
            OpenPrice = decimal.Parse(parts[0], CultureInfo.InvariantCulture),
            HighPrice = decimal.Parse(parts[1], CultureInfo.InvariantCulture),
            LowPrice = decimal.Parse(parts[2], CultureInfo.InvariantCulture),
            ClosePrice = decimal.Parse(parts[3], CultureInfo.InvariantCulture),
            TotalVolume = decimal.Parse(parts[4], CultureInfo.InvariantCulture),
            State = CandleStates.Finished,
        });
    }
    var n = input.Count;

    // Forming-bar probes for the "changing candle" (non-final) parity check: perturb the close of a
    // bar that follows the series and process it WITHOUT committing (IsFinal=false), so the indicator
    // yields a preview off the same committed state each time — mirrors a live last candle redrawing.
    var lastClose = input[n - 1].ClosePrice;
    var probeTime = t0.AddMinutes(n);
    var probes = new List<TimeFrameCandleMessage>();
    foreach (var d in new[] { 0m, 3m, -3m, 12m, -12m })
    {
        var pc = lastClose + d;
        probes.Add(new TimeFrameCandleMessage
        {
            OpenTime = probeTime,
            CloseTime = probeTime,
            OpenPrice = lastClose,
            HighPrice = Math.Max(lastClose, pc) + 1m,
            LowPrice = Math.Min(lastClose, pc) - 1m,
            ClosePrice = pc,
            TotalVolume = 1500m,
            State = CandleStates.Active,
        });
    }

    var outInds = new List<object>();
    foreach (var e in provider.All)
    {
        if (e.Indicator is null || e.IsObsolete) continue;
        IIndicator ind;
        try { ind = (IIndicator)Activator.CreateInstance(e.Indicator); }
        catch { continue; }

        var pdict = ParamDict(e, ind, excluded);

        if (ind is IComplexIndicator ci && ci.InnerIndicators.Count > 0)
        {
            // Multi-line indicator: emit one per-bar value array per inner indicator
            // (gated on the outer IsFormed, matching the single-output convention).
            var inners = ci.InnerIndicators.ToList();
            var lines = new List<List<object>>();
            var lineShifts = new List<List<object>>();
            for (var li = 0; li < inners.Count; li++) { lines.Add(new List<object>()); lineShifts.Add(new List<object>()); }
            var okc = true;
            try
            {
                foreach (var candle in input)
                {
                    var res = ind.Process(MakeInput(e, ind, candle, true));
                    var cv = res as IComplexIndicatorValue;
                    for (var li = 0; li < inners.Count; li++)
                    {
                        object val = null;
                        // Gate each line on its OWN inner indicator's IsFormed (not the outer's),
                        // so per-line warm-up matches the client's independent per-line nulling.
                        if (inners[li].IsFormed && cv != null && cv.InnerValues.TryGetValue(inners[li], out var iv) && !iv.IsEmpty)
                        {
                            try { val = iv.GetValue<decimal>(); } catch { }
                        }
                        lines[li].Add(val);
                        lineShifts[li].Add(cv is not null && cv.InnerValues.TryGetValue(inners[li], out var sv) ? ShiftOf(sv) : null);
                    }
                }
            }
            catch { okc = false; }

            if (okc)
                outInds.Add(new { kind = e.Indicator.Name, @params = pdict, lines, lineNames = inners.Select(x => x.Name).ToList(), shifts = lineShifts, variants = RunMatrix(e, input, excluded) });
            else
                outInds.Add(new { kind = e.Indicator.Name, @params = pdict, complex = true });
            continue;
        }

        var values = new List<object>();
        var shifts = new List<object>();
        var previews = new List<object>();
        var ok = true;
        try
        {
            foreach (var candle in input)
            {
                var res = ind.Process(MakeInput(e, ind, candle, true));
                values.Add(res.IsEmpty || !ind.IsFormed ? null : res.GetValue<decimal>());
                shifts.Add(ShiftOf(res));
            }

            // Non-final previews: each probe is processed with IsFinal=false, which must NOT commit,
            // so every probe reads off the same post-series state (final candle still "forming").
            foreach (var probe in probes)
            {
                var res = ind.Process(MakeInput(e, ind, probe, false));
                previews.Add(res.IsEmpty || !ind.IsFormed ? null : res.GetValue<decimal>());
            }
        }
        catch { ok = false; }
        if (!ok) continue;

        outInds.Add(new { kind = e.Indicator.Name, @params = pdict, values, shifts, previews, variants = RunMatrix(e, input, excluded) });
    }

    var payload = new
    {
        input = input.ConvertAll(cd => new
        {
            t = new DateTimeOffset(cd.OpenTime).ToUnixTimeSeconds(),
            o = cd.OpenPrice,
            h = cd.HighPrice,
            l = cd.LowPrice,
            c = cd.ClosePrice,
            v = cd.TotalVolume,
        }),
        probes = probes.ConvertAll(cd => new
        {
            o = cd.OpenPrice,
            h = cd.HighPrice,
            l = cd.LowPrice,
            c = cd.ClosePrice,
            v = cd.TotalVolume,
        }),
        indicators = outInds,
    };
    Console.WriteLine(JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = false }));
    return;
}

var rows = new List<object>();
foreach (var e in provider.All)
{
    if (e.Indicator is null || e.IsObsolete) continue;
    IIndicator probe;
    try { probe = (IIndicator)Activator.CreateInstance(e.Indicator); }
    catch { continue; }

    // The same list the value dump reports, so the catalogue and the comparison cannot disagree
    // about what an indicator is configured by. Reading the outer object alone left every
    // composite looking as though it had no parameters, because a composite keeps them on its
    // inner lines.
    var knobs = Knobs(probe, excluded);
    var groups = KnobGroups(e.Indicator, excluded, knobs);

    var ps = new List<object>();
    foreach (var knob in knobs)
    {
        var u = Nullable.GetUnderlyingType(knob.Property.PropertyType) ?? knob.Property.PropertyType;
        string type = (u == typeof(int) || u == typeof(long)) ? "int"
            : (u == typeof(decimal) || u == typeof(double) || u == typeof(float)) ? "decimal"
            : (u == typeof(bool)) ? "bool" : null;
        if (type is null) continue;
        object def = null;
        try { def = knob.Property.GetValue(knob.Target); } catch { }
        var target = RuntimeHelpers.GetHashCode(knob.Target) + ":" + knob.Property.Name;
        ps.Add(new { key = knob.Name, type, def, inner = knob.Inner, target,
            group = groups.TryGetValue(knob.Name, out var g) ? g : knob.Name });
    }

    // Which pane an indicator belongs on is not the platform's to say -- a StockSharp indicator
    // has no pane, only a Measure, and the chart decides. So this is derived, and it has to be
    // derived the same way on both sides or the comparison is between two guesses. Anything on a
    // scale of its own goes to its own pane: a percentage, a correlation, and a volume, which
    // shares neither its units nor its magnitude with a price.
    string pane = probe.Measure switch
    {
        IndicatorMeasures.Percent => "separate",
        IndicatorMeasures.MinusOnePlusOne => "separate",
        IndicatorMeasures.Volume => "separate",
        _ => "main",
    };
    int outputs = probe is IComplexIndicator ci && ci.InnerIndicators.Count > 0 ? ci.InnerIndicators.Count : 1;

    // How many values the platform says it needs before it is formed. Every indicator declares it
    // and several override it -- an Alligator defers to its jaw, a shifted line adds its shift --
    // so it is a statement about warm-up that can be checked rather than assumed.
    int warmUp;
    try { warmUp = probe.NumValuesToInitialize; } catch { warmUp = -1; }

    rows.Add(new { kind = e.Indicator.Name, pane, measure = probe.Measure.ToString(), warmUp, outputs, @params = ps });
}

rows.Sort((a, b) => string.CompareOrdinal((string)((dynamic)a).kind, (string)((dynamic)b).kind));
Console.WriteLine(JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true }));


// Where the platform keeps the series its own reference data is pinned against. Resolved from the
// project reference rather than hardcoded, so the two cannot point at different checkouts.
// Where the series lives is the caller's business: parity-dump.mjs resolves the StockSharp
// checkout from the project reference, and passes the path in rather than having it written down
// in two places that can drift apart.
static string OhlcvPath(string[] args)
{
    var at = Array.IndexOf(args, "--ohlcv");
    if (at < 0 || at + 1 >= args.Length)
        throw new ArgumentException("--values needs --ohlcv <path to Tests/Resources/ohlcv.txt>");
    var path = args[at + 1];
    if (!File.Exists(path)) throw new FileNotFoundException("ohlcv series not found", path);
    return path;
}

// One thing that can be turned on an indicator: what the client calls it, the object it lives on,
// and how to set it.
sealed class Knob
{
    public string Name;
    public object Target;
    public PropertyInfo Property;
    /// Whether it lives on an inner line rather than on the indicator itself.
    public bool Inner;
}

sealed class Pass
{
    public List<object> Values;
    public List<List<object>> Lines;
    public List<string> LineNames;
    public List<List<object>> Shifts;
    // Set when the platform refused to run this indicator over this series. Recorded rather than
    // dropped: the client has to refuse too, and a pair deleted from the dump is a comparison
    // nobody makes.
    public string Threw;
}
