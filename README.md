# StockSharp JS Indicators

`@stocksharp/indicators` — the technical-analysis layer of the StockSharp web stack, as a
standalone, dependency-free package: ~165 indicators with both a **batch** and an
**incremental** implementation, a machine-readable catalogue of their parameters, and a
parity suite that checks the arithmetic against the C# platform rather than against itself.

No DOM, no canvas, no chart. The package computes numbers; drawing them is somebody else's
job. [`@stocksharp/chart`](https://github.com/StockSharp/Charts) is the first consumer.

## Install

```bash
npm install @stocksharp/indicators
```

Browser, no bundler — the IIFE build publishes the `SSIndicators` global:

```html
<script src="https://unpkg.com/@stocksharp/indicators/dist/ssindicators.js"></script>
```

## Two ways to compute

**Batch** — a whole series at once, one output point per input bar. This is what a chart
redraw wants:

```js
import { apply, getCalcFn } from '@stocksharp/indicators';

const candles = [{ time: 1710000000, open: 1, high: 2, low: 0.5, close: 1.5 }, /* ... */];

const sma = apply('SimpleMovingAverage', candles, { length: 20 });  // [{time, value}, ...]
const bb  = apply('bb', candles, { length: 20, deviation: 2 });     // {upper: [...], middle: [...], lower: [...]}
```

Both the platform's canonical kind (`SimpleMovingAverage`) and its short alias (`sma`)
resolve to the same function, case-insensitively.

**Incremental** — one bar in, one value out, O(1) per update, with the running state kept
inside. This is what a live feed wants:

```js
import { IndicatorRuntime, RelativeStrengthIndexIndicator } from '@stocksharp/indicators';

const rsi = new IndicatorRuntime({
    definition: RelativeStrengthIndexIndicator,
    parameters: { length: 14 },
});

for (const bar of stream)
    rsi.update({ time: bar.time, value: bar }, /* isFinal */ true);

rsi.points('line');   // the formed values, aligned to their bar index
```

The runtime is built for a live feed rather than a replay: the unclosed bar can be pushed
with `isFinal: false` and withdrawn (`discardPreview`), a bar that arrives corrected is
replayed from the nearest checkpoint (`correct`), and the whole state serialises
(`snapshot`) so a reconnect does not recompute the history.

The two paths are independent implementations of the same formula and are tested against
each other — a divergence between them is a bug in one of them.

## The catalogue

Every indicator is described by data, not by prose: its canonical kind, aliases, parameter
keys with defaults and ranges, output shape, and which pane it belongs on.

```js
import { getClientCatalog, getIndicatorDefinition } from '@stocksharp/indicators';

getClientCatalog();                                   // the full list, ready for a picker UI
getIndicatorDefinition('MoneyFlowIndex')?.parameters; // one entry
```

A UI can build its indicator picker straight from this without knowing a single indicator
by name.

## Correctness

The reference is StockSharp's C# `Algo.Indicators`, not this package's own output. With the
.NET SDK and a sibling `StockSharp (GitHub)` checkout present, `npm test` builds a dumper
against the real platform and compares catalogue *and* values against it. Without them
those tests skip, and say which of the two is missing — they never pass quietly.

See [`AGENTS.md`](AGENTS.md) for the layout, the commands and the rules that keep the
parity suite honest.

## License

Proprietary — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
