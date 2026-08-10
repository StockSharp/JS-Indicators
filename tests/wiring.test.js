// Whether a new indicator actually reaches the tests, or just sits on disk.
//
// Every scan in this suite iterates a registry: the contract tests walk the definitions, the
// parity scans walk the dump and look each kind up. That makes them automatic for anything
// registered -- and blind to anything that is not. A file registers itself only if it is exported
// from src/calc/index.ts, so one added and not wired in is invisible everywhere: no parity, no
// contract, and nothing red to say so.
//
// This file is the tripwire. It reads what is on disk and compares it to what the package
// registers, so "drop in an indicator" either works end to end or fails here naming the file.
// It knows no indicator by name and never will: everything below is derived.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const { getClientCatalog, getIndicatorDefinitions } = require('../src/index.js');

// Bundled to tests/_dist as CommonJS, so __dirname is that directory and the sources are two up.
const srcDir = join(__dirname, '..', '..', 'src');

/// Every indicator file on disk, by the kind it registers. What a family shares lives in
/// src/calc/shared, so a file directly in src/calc is an indicator and declares itself so by
/// calling registerIndicator -- a rule about shape rather than a list of file names.
function indicatorModules() {
    const found = [];
    for (const file of readdirSync(join(srcDir, 'calc')).sort()) {
        if (!file.endsWith('.ts') || file === 'index.ts') continue;
        const source = readFileSync(join(srcDir, 'calc', file), 'utf8');
        const registered = [...source.matchAll(/registerIndicator\(\{\s*\n\s*id: '([^']+)'/g)]
            .map((m) => m[1]);
        found.push({ file, registered });
    }
    return found;
}

const modules = indicatorModules();
const definitions = getIndicatorDefinitions();

describe('wiring: an indicator that exists is an indicator that is tested', () => {
    it('every indicator file on disk is registered, under the name the file carries', () => {
        const registry = new Set(getClientCatalog().map((e) => e.id));
        const wrong = [];

        for (const { file, registered } of modules) {
            if (registered.length === 0) {
                wrong.push(`${file}: registers no indicator, so nothing tests it`);
                continue;
            }
            if (registered.length > 1) {
                wrong.push(`${file}: registers ${registered.length} -- ${registered.join(', ')}`);
                continue;
            }
            const [kind] = registered;
            if (!registry.has(kind)) {
                wrong.push(`${file}: registers ${kind}, which the catalogue does not carry`
                    + ' -- the file is not exported from src/calc/index.ts');
                continue;
            }
            // The parity comparison finds an indicator's source from its kind, so the two have to
            // agree on the spelling.
            if (file !== `${kind.toLowerCase()}.ts`)
                wrong.push(`${file}: registers ${kind}, which belongs in ${kind.toLowerCase()}.ts`);
        }

        assert.deepEqual(wrong, [],
            `${wrong.length} indicator files are not wired to what they claim:\n` + wrong.join('\n'));
    });

    it('the catalogue and the definitions describe the same set', () => {
        const catalogue = new Set(getClientCatalog().map((e) => e.id));
        const declared = new Set(definitions.map((d) => d.id));

        const noDefinition = [...catalogue].filter((id) => !declared.has(id));
        const noCatalogue = [...declared].filter((id) => !catalogue.has(id));

        // Named separately because each hole breaks a different half of the suite: a kind with no
        // definition escapes the contract and streaming tests, and one with no catalogue entry is
        // invisible to the picker and to the parity catalogue check.
        assert.deepEqual(noDefinition, [], `catalogued but never registered as a definition: ${noDefinition.join(', ')}`);
        assert.deepEqual(noCatalogue, [], `registered as a definition but absent from the catalogue: ${noCatalogue.join(', ')}`);
    });

    it('every registered definition declares what a test needs to drive it', () => {
        const malformed = [];

        for (const definition of definitions) {
            if (!definition.id) { malformed.push('a definition with no id'); continue; }
            if (!Array.isArray(definition.outputs) || definition.outputs.length === 0) {
                malformed.push(`${definition.id}: declares no outputs, so nothing can read its line`);
            }
            for (const output of definition.outputs || []) {
                if (!output.id) malformed.push(`${definition.id}: an output with no id`);
            }
            for (const parameter of definition.parameters || []) {
                if (!parameter.id) malformed.push(`${definition.id}: a parameter with no id`);
                // Every generic test builds an indicator from its declared defaults. One that
                // declares none cannot be built without someone knowing what it wants.
                if (parameter.defaultValue === undefined) {
                    malformed.push(`${definition.id}.${parameter.id}: no defaultValue, so no test can build it`);
                }
            }
            if (typeof definition.processorFactory !== 'function') {
                malformed.push(`${definition.id}: no processorFactory, so the streaming path cannot be tested`);
            }
        }

        assert.deepEqual(malformed, [],
            `${malformed.length} definitions cannot be driven by a generic test:\n` + malformed.join('\n'));
    });
});
