// The catalogue a picker shows: every indicator this package can run, with the metadata a host
// needs to list, search and configure it.
//
// This used to live in the batch calc registry, because that registry was also where the short
// names lived. The batch layer is gone -- the chart never ran it -- but none of this was ever
// about batch arithmetic: it is the definition's own category, pane and outputs, joined to the
// catalogue's parameter descriptions and to the short names a search box matches on.

import { getIndicatorDefinitions } from './indicator-registry.js';
import { indicatorCategoryLabel } from './indicator-taxonomy.js';

/**
 * English label of a parameter, output or indicator key, derived from its camelCase spelling.
 *
 * This IS the i18n key: `T.t(humanize(key))` resolves it against the host's dictionary and falls
 * back to the English here, so no separate label is stored anywhere -- the key is the single
 * source for both the identifier and what is shown.
 */
export function humanize(key: string): string {
    return String(key)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
}

/** The short names a kind also answers to, e.g. `sma` for SimpleMovingAverage. */
export function getIndicatorAliases(kind: string): string[] {
    const definition = getIndicatorDefinitions().find((d) => d.id === kind);
    return definition?.aliases ? [...definition.aliases] : [];
}

/**
 * Every runnable indicator, as a flat record per kind.
 *
 * Built from the definitions themselves. There used to be a catalog.json alongside them repeating
 * the name, group, pane, outputs and parameters of every indicator, and the two had already
 * drifted -- three names, eleven groups and four parameter bounds disagreed, with nothing deciding
 * which was right. The definition is what actually runs, so it is the one that describes itself.
 */
export function getClientCatalog(): any[] {
    return getIndicatorDefinitions().map((definition) => ({
        id: definition.id,
        serverKind: definition.id,
        name: definition.name,
        fullName: humanize(definition.id),
        aliases: definition.aliases ? [...definition.aliases] : [],
        group: indicatorCategoryLabel(definition.category),
        category: definition.category,
        pane: definition.naturalPane,
        measure: definition.measure,
        params: definition.parameters.map((parameter) => ({
            key: parameter.id,
            aliases: parameter.aliases ? [...parameter.aliases] : [],
            default: parameter.defaultValue,
            min: parameter.min,
            max: parameter.max,
            step: parameter.step,
        })),
        outputs: definition.outputs.map((output) => output.id),
        painter: definition.painter,
        scaleRange: definition.scaleRange,
        levels: definition.levels,
    }));
}
