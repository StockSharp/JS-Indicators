# AGENTS.md -- JS-Indicators

## What this is

`@stocksharp/indicators` (see `package.json` for the current version) is the technical-analysis
layer of the StockSharp web stack, extracted from
[Charts](https://github.com/StockSharp/Charts) so that it can be depended on without depending
on a canvas engine. ~165 indicators, each with **two independent implementations** — a batch
one (`src/calc/`) and an incremental one (`src/built-ins/`) — plus the generated catalogue that
describes their parameters.

The authority for what a value should be is the C# platform (`StockSharp/Algo.Indicators`), not
this code. That is what the parity suite is for.

This is a **TypeScript / Node** repo (ESM, `"type": "module"`) built with **esbuild** — no
runtime dependencies at all; dev deps are only `esbuild` and `typescript`.

Workspace-wide agent rules live in the configs repo (`configs/instructions.md`) and load
automatically; this file is repo-specific only.

## Build, test, run

`npm install` once. Note that it also runs `prepare`, which builds `dist/` — that is deliberate,
see "Consumers" below.

| Command | What it does |
|---|---|
| `npm run build` | `tsc` -> `dist/esm` + `dist/types`, esbuild -> `dist/ssindicators.js` (the `SSIndicators` global) |
| `npm test` | `typecheck` + `api:check` + bundle unit tests (`build-tests.mjs`) + build the C# parity dump (`tools/parity-dump.mjs`) + `node --test` over `tests/_dist/**/*.test.cjs` |
| `npm run typecheck` | `tsc -p tsconfig.typecheck.json` (no emit) — covers all of `src` and `tests/types` |
| `npm run api:check` / `api:update` | verify / regenerate the public-API snapshot |
| `npm run pack:check` | `npm pack --dry-run` — what would actually ship |

`npm test` needs no browser. It does not need the .NET SDK either, but with the SDK **and** a
sibling `StockSharp (GitHub)` checkout present it additionally runs the parity tests that
compare this port against the real platform; without them `tools/parity-dump.mjs` records why
and those tests skip with that reason named.

## Layout

```
src/index.ts          the package surface: batch + incremental + catalogue
src/types.ts          Time, CandlestickData, LineStyleValue — the boundary this package owns
src/calc/             ~165 batch calc functions (whole series in, one point per bar out)
src/built-ins/        the incremental definitions, registered into the registry at load time
src/math/             shared kernels (rolling windows, moving averages, true range, ...)
src/catalog.json      generated catalogue: kinds, aliases, parameters, ranges, panes, outputs
src/indicator-*.ts    definition/registry/runtime/source/taxonomy — the incremental machinery
tests/indicators/     163 per-indicator specs, one file each
tests/incremental-*   the incremental implementation checked against the batch one
tests/parity*.test.js catalogue and value parity against the live C# dump
tools/                check-public-api.mjs, public-api-manifest.mjs, parity-dump.mjs,
                      csharp-catalog/ (.NET parity dumper)
```

Build outputs are git-ignored: `dist/`, `tests/_dist/`, `.parity-cache/`.

## Consumers

[Charts](https://github.com/StockSharp/Charts) depends on this package and re-exports part of
it, so its build breaks first when this one changes. Until the package is published to npm,
Charts consumes it as a **git dependency pinned to a commit** — which is why `package.json` has
a `prepare` script: npm builds a git dependency on install, and without `prepare` the consumer
would install a package with no `dist/`.

Working on both at once: `npm link` in this repo, then `npm link @stocksharp/indicators` in
Charts, and remember to unlink before trusting a green Charts run.

## Gotchas / do not break

- **No DOM.** `tsconfig.json` sets `"lib": ["ES2022"]` with no `DOM`, on purpose: the package
  must stay usable in a worker, in node and on a server. If you find yourself wanting
  `document` or `performance`, the code belongs in the consumer, not here.
- **Public API is snapshot-gated.** `check-public-api.mjs` emits declarations via
  `tsconfig.api.json` and diffs them against `tests/api/ssindicators.d.ts`. Any public surface
  change fails `npm test` until you run `npm run api:update` and commit the updated snapshot.
- **The registry is filled by side effects.** `registerIndicator(...)` runs at module load. A
  `"sideEffects": false` in `package.json` would let a bundler tree-shake every registration
  away — lookups would return `undefined` while every unit test still passed, because tests
  import the definitions directly. `build.mjs` asserts the count on the bundle for exactly
  that reason; do not silence it.
- **Parity test reads C# live, no fixture.** `tools/csharp-catalog` is a .NET (`net10.0`) dumper
  that references a sibling `..\..\..\StockSharp (GitHub)\Algo.Indicators` checkout and prints
  the authoritative StockSharp catalogue/values. Do not commit a static fixture — it is
  intentionally live. `tools/parity-dump.mjs` runs it **once** before `node --test` and caches
  the JSON in `.parity-cache/`; the parity files only read that cache. Never invoke `dotnet`
  from inside a test file: node:test runs files in parallel workers, and two concurrent builds
  of the same project fail with `CS2012` on the shared obj output.
- **A parity skip must name its reason.** Exactly three conditions skip:
  `stocksharp-checkout-absent`, `dotnet-missing`, `dotnet-sdk-missing`. Anything else — a
  failing build, a crashing dumper, non-JSON output, an unparsable cache — is a hard failure.
  Do not add a `catch` that turns a new failure mode into a skip; the suite spent a long time
  reporting itself green that way.
- **Parity exemptions are exact allow-lists.** `NO_JS_CALC`, `NON_SCALAR`, `PANE_DELTAS` and
  `PARAM_COUNT_DELTAS` are asserted in both directions: an unlisted divergence fails, and so
  does a list entry that no longer applies. When you fix one, delete its entry.
- **Indicator semantics follow `[IndicatorIn]`, not the C# source's variable names.**
  `Highest.OnProcessDecimal` reads `input.ToCandle().HighPrice`, which looks like the bar high
  but is the **close**: the class inherits `[IndicatorIn(typeof(DecimalIndicatorValue))]`, and
  wrapping a decimal in a candle makes O/H/L/C identical. Check the attribute before porting
  anything, and check the pinned vectors in
  `StockSharp (GitHub)/Tests/Resources/IndicatorsData`.
- **Two implementations, one formula.** Every indicator exists twice on purpose. A change to
  one without the other is a bug the `incremental-*` tests are there to catch — they compare
  the two against each other, so never "fix" a mismatch by editing the test's expectation.
