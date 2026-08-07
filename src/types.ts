// The shapes this package needs from the outside world -- and nothing more.
//
// These three used to come from the chart's public API, which is what tied the whole indicator
// layer to a canvas engine it never called. They are declared here instead, so the package owns
// its own boundary: a consumer passes its bars in and gets numbers back, and neither side has to
// know the other's module graph.
//
// They are deliberately structural rather than branded. A chart that already has its own `Time`
// and candle types keeps them; TypeScript matches them by shape, so nothing has to be converted
// at the call site. The cost of that freedom is that the two definitions could drift apart
// without the compiler noticing -- so the consumer is expected to pin the compatibility with a
// type-level assertion (Charts does, in tests/types/indicators-boundary.ts).

/** A bar timestamp: UNIX **seconds**, not milliseconds. */
export type Time = number;

/** One input bar. Volume is optional because most indicators never read it. */
export interface CandlestickData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

/**
 * How a line is dashed: Solid 0, Dotted 1, Dashed 2, LargeDashed 3, SparseDotted 4.
 *
 * An indicator only ever *suggests* a style through its output metadata; the numbers match the
 * chart's `LineStyle` enum so the suggestion can be used as-is. The enum object itself is not
 * re-declared here -- a package that computes numbers has no business owning a drawing constant,
 * and duplicating it would give consumers two `LineStyle` symbols to disambiguate.
 */
export type LineStyleValue = 0 | 1 | 2 | 3 | 4;
