// The type-level shape of every registered indicator, without naming one.
//
// There used to be ten files here, one per family, each holding a line like
//
//     const definition: IndicatorDefinition<IndicatorCandle, ChaikinVolatilityParameters>
//         = ChaikinVolatilityIndicator;
//
// which is a verbatim copy of the annotation on the definition itself in
// src/calc/chaikinvolatility.ts. It cannot fail unless somebody deletes that annotation, and
// it had to be written again for every indicator added. The same went for `void new
// ChaikinVolatilityProcessor(32, 5)`, which restates a constructor signature the class declares
// three lines from where it is used.
//
// What is worth checking at the type level is what the registry promises about all of them at
// once, which is what this asserts.

import {
    getIndicatorDefinition,
    getIndicatorDefinitions,
    resolveIndicatorOutputs,
    type IndicatorCandle,
    type IndicatorDefinition,
    type IndicatorParameters,
    type IIndicatorProcessor,
} from '../../src/index.js';

// Everything registered is a candlestick indicator over some parameter shape. A definition
// registered with a different input kind would fail here rather than at the first bar.
const all: readonly IndicatorDefinition<IndicatorCandle, IndicatorParameters>[] = getIndicatorDefinitions();
void all;

// Looking one up gives the same thing, or nothing.
const one: IndicatorDefinition<IndicatorCandle, IndicatorParameters> | undefined
    = getIndicatorDefinition('SimpleMovingAverage');
void one;

for (const definition of all) {
    // A definition can always be built from its own declared defaults: the parameter record it
    // accepts is keyed by string, so a definition whose factory demanded something narrower --
    // a positional list, a class instance -- would not type-check here.
    const parameters: IndicatorParameters = Object.fromEntries(
        definition.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
    );

    const processor: IIndicatorProcessor<IndicatorCandle> = definition.processorFactory(parameters);
    void processor;

    // And its outputs resolve to something with ids, whether they are fixed or derived from the
    // parameters the way a ribbon's are.
    const ids: readonly string[] = resolveIndicatorOutputs(definition, parameters).map((output) => output.id);
    void ids;
}
