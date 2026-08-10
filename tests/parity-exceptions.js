// The indicators this port does not compute at all, as data rather than as test code.
//
// This is the only kind of exception left. Everything else that once lived here was a difference
// from StockSharp -- a default, a pane, a parameter count -- and those are failures now: the same
// indicator has to draw the same line here and on the terminal. What remains is an indicator the
// platform ships and this port has no processor for, which is not a disagreement about arithmetic
// but a gap in coverage, and there is nothing to compare until somebody writes it.
//
// So the sets are asserted against a committed snapshot, exactly as the public API surface already
// is. A new indicator that lands in one of them fails the run; an entry that stops applying fails
// it too. Regenerate deliberately, and review the diff:
//
//     npm run parity:update
//
// The reason strings are for the reader and are preserved across regeneration -- a new key comes
// back with an empty reason, which is the prompt to write one.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// Bundled to tests/_dist as CommonJS, so __dirname is that directory.
const file = join(__dirname, '..', '..', 'tests', 'api', 'parity-exceptions.json');
const UPDATE = process.env.SS_PARITY_EXCEPTIONS === 'update';

function read() {
    return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Assert that the indicators observed in some category are exactly the ones recorded for it.
 *
 * `observed` is whatever the test computed this run -- an array of kinds, or a map of kind to a
 * description of the difference. Only the key set is compared; the recorded reasons are prose.
 */
export function assertRecorded(section, observed, what) {
    const keys = [...(Array.isArray(observed) ? observed : Object.keys(observed))].sort();

    if (UPDATE) {
        // Re-read before writing: node's test runner gives each file its own process, so several
        // sections are updated concurrently and each must keep the others' work.
        const all = read();
        const previous = all[section] || {};
        all[section] = Object.fromEntries(keys.map((k) => [k, previous[k] ?? '']));
        writeFileSync(file, JSON.stringify(all, null, 4) + '\n');
        return;
    }

    const recorded = Object.keys(read()[section] || {}).sort();
    const added = keys.filter((k) => !recorded.includes(k));
    const gone = recorded.filter((k) => !keys.includes(k));
    const problems = [];
    if (added.length) problems.push(`${what} that are not recorded:\n  ${added.join('\n  ')}`);
    if (gone.length) problems.push(`${what} recorded but no longer true (remove them): ${gone.join(', ')}`);

    assert.equal(problems.length, 0,
        problems.join('\n') + `\n\nIf this is intended, run npm run parity:update and review tests/api/parity-exceptions.json.`);
}
