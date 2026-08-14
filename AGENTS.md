# AGENTS.md -- JS-Indicators

## What this is

`@stocksharp/indicators` (see `package.json` for the current version) is the technical-analysis
layer of the StockSharp web stack, extracted from
[Charts](https://github.com/StockSharp/Charts) so that it can be depended on without depending
on a canvas engine. 163 indicators, one implementation each in `src/calc/`, plus the catalogue a
picker reads — which is derived from the definitions themselves rather than stored anywhere.

Each indicator is a `SequentialIndicatorProcessor` with a single `calculate(input, commit)`, and
that one method answers on **two paths**: a commit, which advances the indicator's state, and a
preview of a bar that is still forming, which must produce the same value the platform would and
mutate nothing. Most of what goes wrong in this package goes wrong on the second one.

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
| `npm run parity:update` | regenerate `tests/api/parity-exceptions.json` — the indicators this port has no processor for |
| `npm run pack:check` | `npm pack --dry-run` — what would actually ship |

`npm test` needs no browser. It **does** require the .NET SDK and a sibling
`StockSharp (GitHub)` checkout because parity against the real platform is release-gating.
If either is unavailable, `tools/parity-dump.mjs` names the reason and the command fails.

## Layout

```
src/index.ts          the package surface: definitions, runtime, catalogue
src/types.ts          Time, CandlestickData, LineStyleValue — the boundary this package owns
src/calc/             163 indicator definitions, one file each, registered at module load
src/calc/shared/      the parameter shapes and guards several definitions have in common
src/math/             shared kernels (rolling windows, moving averages, true range, ...)
src/sequential-processor.ts
                      the commit/preview machinery every definition is built on: formation
                      latching, warm-up masking, checkpoints
src/indicator-*.ts    definition/registry/runtime/source/taxonomy/catalog
tests/incremental-*   platform semantics pinned by hand, and one bar at a time checked against
                      all the bars at once
tests/*parity*.test.js
                      against the live C# dump: parity.test.js the catalogue, numeric-parity
                      the values bar-for-bar and on a forming bar, parity-scan the same
                      comparison off the default operating point (see below)
tests/types/          type-level tests -- they emit nothing, they fail the typecheck
tools/                check-public-api.mjs, public-api-manifest.mjs, parity-dump.mjs,
                      parity-update.mjs, csharp-catalog/ (.NET parity dumper)
```

Build outputs are git-ignored: `dist/`, `tests/_dist/`, `.parity-cache/`.

## Consumers

[Charts](https://github.com/StockSharp/Charts) depends on this package and re-exports part of
it, so its build breaks first when this one changes. It consumes a published range
(`"@stocksharp/indicators": "^2.0.1"` at the time of writing), so a change reaches it through a
release, not through this working tree. `package.json` keeps a `prepare` script anyway, because
it is what makes an install straight from git work at all: npm builds a git dependency on
install, and without `prepare` the consumer would get a package with no `dist/`.

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
- **Parity never skips.** A missing StockSharp checkout, missing .NET SDK, failing build,
  crashing dumper, non-JSON output or unparsable cache is a hard failure. Do not add a `catch`
  or `t.skip` on this path; the suite spent a long time reporting itself green that way.
- **One operating point proves almost nothing.** `numeric-parity` compares every indicator
  against the platform bar-for-bar, and it passed for a long time while sixteen indicators were
  wrong -- because it runs one smooth series at default parameters. `parity-scan.test.js` adds
  the two axes that hid them: every settable parameter moved off its default (integers at 1, 2,
  3, 6 and 21, booleans both ways, fractions at 0.5, 1 and 2), and every indicator over thirteen
  awkward candle shapes (constant, rising, falling, spike, gap, alternating, zero volume, tiny,
  zero price, down only, flat plateau, ties, steps). Both axes are driven off what the platform
  reports an indicator has, so a new indicator or a new parameter is covered without being
  listed anywhere.
- **What that scan still does not reach is the forming bar.** Previews are compared at default
  parameters only, and only on probes appended after a long series -- by which point every
  window is full and every indicator formed long ago. Five divergences lived in that gap at
  once: three indicators counted the forming bar towards their own formation and drew a point a
  bar early, one measured a rolling base from the wrong slot on every preview, and one previewed
  a moving average without dropping the sample the platform drops. So when you touch a preview
  path, read the C# and pin it with a unit test. A green suite is not evidence there.
- **A flat window is the case to check first.** Most of what the scan caught was one mistake in
  different costumes: a window where every price is identical makes ranges and deviations zero,
  and the platform emits no value there. Inventing one (0, -100, "bottom of the range") is wrong,
  and so is testing for it with `=== 0` on a rolling sum -- accumulate and evict across a window
  and you carry ~1e-14 of drift, so the guard misses and the division returns the residual over
  itself. Decide flatness on the prices.
- **A commit and a preview are one formula, and both have to move.** Fixing the committed
  arithmetic and leaving the preview reading the old window (or the reverse) is the most common
  way to break this package, and it is exactly the kind of half-fix the parity suite may not
  catch. When a test says the two disagree, that is the reminder working -- never answer it by
  editing the expectation.
- **The only parity exemption left is "not implemented here".** `tests/api/parity-exceptions.json`
  records the indicators this port has no processor for, and nothing else: a differing default, a
  differing pane, a differing parameter count are all failures now. It is asserted in both
  directions, so an unlisted gap fails and so does an entry that no longer applies. Regenerate it
  with `npm run parity:update` and review the diff -- a new key comes back with an empty reason,
  which is the prompt to write one.
- **Indicator semantics follow `[IndicatorIn]`, not the C# source's variable names.**
  `Highest.OnProcessDecimal` reads `input.ToCandle().HighPrice`, which looks like the bar high
  but is the **close**: the class inherits `[IndicatorIn(typeof(DecimalIndicatorValue))]`, and
  wrapping a decimal in a candle makes O/H/L/C identical. Check the attribute before porting
  anything, and check the pinned vectors in
  `StockSharp (GitHub)/Tests/Resources/IndicatorsData`.
- **A forming bar never reaches the platform's buffer.** StockSharp pushes only on a final
  input, so anything an indicator gates on `Buffer.Count` -- its own formation above all -- still
  sees the window one sample short during a preview, and a rolling base sits one slot further
  back than a commit would have left it. StockSharp's own SMA goes further and previews with
  `Buffer.SumNoFirst + value`, dropping its oldest sample even before the window has filled.
  None of this is derivable from the committed path; read the C# for the preview separately.
