// The package surface. Two ways to compute the same formulas, plus the catalogue that
// describes them:
//
//   apply / getCalcFn        batch    -- a whole series in, one point per bar out
//   IndicatorRuntime         live     -- one bar in, O(1), state kept inside
//   getClientCatalog         metadata -- parameters, defaults, ranges, output shape
//
// Nothing here touches the DOM.

export type { CandlestickData, LineStyleValue, Time } from './types.js';

export * from './indicator-definition.js';
export * from './indicator-registry.js';
export * from './sequential-processor.js';
export * from './indicator-runtime.js';
export * from './indicator-source.js';
export * from './indicator-output-style.js';
export * from './indicator-taxonomy.js';
export * from './math/index.js';
export * from './built-ins/index.js';

export * from './calc/index.js';
export type { CandlePoint, IndicatorLines, IndicatorParams, IndicatorPoint } from './calc/types.js';
