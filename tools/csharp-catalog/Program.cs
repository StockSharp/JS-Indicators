// Dumps the StockSharp indicator catalog (kind, pane, measure, output count, param keys/types/
// defaults) to stdout as JSON. Referenced live by the Charts parity test — no committed fixture.
using System;
using System.Collections.Generic;
using System.Reflection;
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
static Pass RunSeries(IndicatorType type, IIndicator indicator, List<TimeFrameCandleMessage> input)
{
    var inners = indicator is IComplexIndicator ci && ci.InnerIndicators.Count > 0 ? ci.InnerIndicators.ToList() : null;
    var values = new List<object>();
    var lines = new List<List<object>>();
    if (inners is not null)
        for (var li = 0; li < inners.Count; li++) lines.Add([]);

    try
    {
        foreach (var candle in input)
        {
            var res = indicator.Process(MakeInput(type, indicator, candle, true));
            if (inners is null)
            {
                values.Add(res.IsEmpty || !indicator.IsFormed ? null : res.GetValue<decimal>());
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
            }
        }
    }
    catch { return null; }

    return inners is null
        ? new Pass { Values = values }
        : new Pass { Lines = lines, LineNames = inners.ConvertAll(x => x.Name) };
}

// Run one indicator over the series once per matrix width, returning the per-width outputs a
// client calc has to reproduce.
static List<object> RunMatrix(IndicatorType type, List<TimeFrameCandleMessage> input)
{
    // Window widths the matrix runs each indicator at, on top of its own default. The default
    // alone hides every divergence that lives at another width: a boundary clamp the port forgot
    // at Length 1-2, a buffer read that happens to be right only at the default. 1 and 2 are the
    // degenerate ends, 6 and 21 sit either side of the usual defaults.
    int[] widths = [1, 2, 3, 6, 21];
    var variants = new List<object>();
    foreach (var length in widths)
    {
        IIndicator ind;
        try { ind = (IIndicator)Activator.CreateInstance(type.Indicator); }
        catch { break; }
        if (!TrySetLength(ind, length)) break;

        var pass = RunSeries(type, ind, input);
        if (pass is null) continue;

        variants.Add(pass.Values is not null
            ? new { length, values = pass.Values }
            : (object)new { length, lines = pass.Lines });
    }
    return variants;
}

// The candle shapes the stress pass runs every indicator over. The smooth series the rest of the
// dump uses is well behaved by construction -- it never repeats a price, never gaps and never
// divides by zero -- so a port can be wrong about all three and still agree with the platform on
// every bar of it. Each shape below is one of those blind spots made explicit.
string[] stressShapes = ["constant", "rising", "falling", "spike", "gap", "alternating", "zerovolume", "tiny"];

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

// Set the indicator's own Length, and only its own. Returns false when it has none, which is how
// an indicator without a single window opts out of the matrix.
//
// Deliberately not recursive into a composite's inner indicators. Forcing one length onto all of
// them describes a configuration the client cannot be asked to reproduce -- MACD with both its
// moving averages at the same length is identically zero, and the client's calc takes `short` and
// `long`, not one `length`. Every divergence that came back from such a run would be an artefact
// of the harness. Composites whose window lives in their parts are covered by the default-parameter
// and stress passes instead.
static bool TrySetLength(IIndicator indicator, int length)
{
    var property = indicator.GetType().GetProperty("Length", BindingFlags.Public | BindingFlags.Instance);
    if (property is null || property.GetSetMethod() is null || property.PropertyType != typeof(int))
        return false;

    try { property.SetValue(indicator, length); }
    catch { return false; }
    return true;
}

// The settable numeric/bool properties that make up an indicator's parameter set, with the values
// the platform defaults them to. The client reads these back to drive its own calc with the same
// configuration, so the comparison is of arithmetic rather than of two different setups.
static Dictionary<string, object> ParamDict(IndicatorType type, IIndicator indicator, HashSet<string> excluded)
{
    var pdict = new Dictionary<string, object>();
    foreach (var p in type.Indicator.GetProperties(BindingFlags.Public | BindingFlags.Instance))
    {
        if (p.GetSetMethod() is null || excluded.Contains(p.Name)) continue;
        var u = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
        if (u != typeof(int) && u != typeof(long) && u != typeof(decimal) && u != typeof(double) && u != typeof(float) && u != typeof(bool))
            continue;
        try { pdict[p.Name] = p.GetValue(indicator); } catch { }
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
            inds.Add(pass.Values is not null
                ? new { kind = e.Indicator.Name, @params = pdict, values = pass.Values }
                : (object)new { kind = e.Indicator.Name, @params = pdict, lines = pass.Lines, lineNames = pass.LineNames });
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
    const int n = 200;
    var t0 = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    var input = new List<TimeFrameCandleMessage>();
    for (var i = 0; i < n; i++)
    {
        var c = Math.Round((decimal)(100.0 + 15.0 * Math.Sin(i / 9.0) + 6.0 * Math.Cos(i / 4.0) + i * 0.05), 2);
        var o = i == 0 ? c : input[i - 1].ClosePrice;
        var spread = Math.Round((decimal)(1.5 + Math.Abs(Math.Sin(i / 3.0))), 2);
        var time = t0.AddMinutes(i);
        input.Add(new TimeFrameCandleMessage
        {
            OpenTime = time,
            CloseTime = time,
            OpenPrice = o,
            HighPrice = Math.Max(o, c) + spread,
            LowPrice = Math.Min(o, c) - spread,
            ClosePrice = c,
            TotalVolume = Math.Round((decimal)(1500.0 + 400.0 * Math.Sin(i / 5.0)), 2),
            State = CandleStates.Finished,
        });
    }

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
            for (var li = 0; li < inners.Count; li++) lines.Add(new List<object>());
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
                    }
                }
            }
            catch { okc = false; }

            if (okc)
                outInds.Add(new { kind = e.Indicator.Name, @params = pdict, lines, lineNames = inners.Select(x => x.Name).ToList(), variants = RunMatrix(e, input) });
            else
                outInds.Add(new { kind = e.Indicator.Name, @params = pdict, complex = true });
            continue;
        }

        var values = new List<object>();
        var previews = new List<object>();
        var ok = true;
        try
        {
            foreach (var candle in input)
            {
                var res = ind.Process(MakeInput(e, ind, candle, true));
                values.Add(res.IsEmpty || !ind.IsFormed ? null : res.GetValue<decimal>());
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

        outInds.Add(new { kind = e.Indicator.Name, @params = pdict, values, previews, variants = RunMatrix(e, input) });
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

    var ps = new List<object>();
    foreach (var p in e.Indicator.GetProperties(BindingFlags.Public | BindingFlags.Instance))
    {
        if (p.GetSetMethod() is null || excluded.Contains(p.Name)) continue;
        var u = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
        string type = (u == typeof(int) || u == typeof(long)) ? "int"
            : (u == typeof(decimal) || u == typeof(double) || u == typeof(float)) ? "decimal"
            : (u == typeof(bool)) ? "bool" : null;
        if (type is null) continue;
        object def = null;
        try { def = p.GetValue(probe); } catch { }
        ps.Add(new { key = p.Name, type, def });
    }

    string pane = probe.Measure switch
    {
        IndicatorMeasures.Percent => "separate",
        IndicatorMeasures.MinusOnePlusOne => "separate",
        _ => "main",
    };
    int outputs = probe is IComplexIndicator ci && ci.InnerIndicators.Count > 0 ? ci.InnerIndicators.Count : 1;

    rows.Add(new { kind = e.Indicator.Name, pane, measure = probe.Measure.ToString(), outputs, @params = ps });
}

rows.Sort((a, b) => string.CompareOrdinal((string)((dynamic)a).kind, (string)((dynamic)b).kind));
Console.WriteLine(JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true }));

// One indicator's output over one series: either a single line of values, or one line per inner
// indicator of a composite. A plain class rather than a tuple because it crosses three call sites
// and "Item1" would tell the reader nothing.
sealed class Pass
{
    public List<object> Values;
    public List<List<object>> Lines;
    public List<string> LineNames;
}
