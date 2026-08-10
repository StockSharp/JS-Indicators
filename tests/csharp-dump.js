// Read the StockSharp dumps that tools/parity-dump.mjs produced before node:test started.
//
// Deliberately free of try/catch: the only silence allowed on this path is the three
// unavailable reasons the prep step detects on purpose and records in status.json. Every
// other failure — no prep run, unparsable cache, missing dump — must be loud, because a
// swallowed error here is exactly how the parity suite used to report itself green while
// never talking to the platform.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// This module is only ever reached through the esbuild bundles in tests/_dist, which are emitted
// as CommonJS — so `__dirname` is the one location primitive that exists here (`import.meta.url`
// does not survive the ESM -> CJS conversion). It points at tests/_dist, hence two levels up.
const cacheDir = join(__dirname, '..', '..', '.parity-cache');

export function loadDumpStatus() {
    const file = join(cacheDir, 'status.json');
    if (!existsSync(file)) {
        throw new Error(
            '.parity-cache/status.json is missing — the parity dump is produced by ' +
            '`node tools/parity-dump.mjs`, which `npm test` runs for you. Run `npm test` ' +
            'rather than invoking `node --test` on tests/_dist directly.');
    }
    return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Refuse to run a parity test that cannot reach the platform.
 *
 * This used to be `t.skip(reason)`, which reads as a pass: on CI, where the sibling StockSharp
 * checkout is absent, ten of the twelve parity tests skipped and the job exited 0 -- including the
 * job that publishes. A suite that cannot compare against the platform has not compared against the
 * platform, and it should say so in the colour that gets read.
 */
export function requireDump(status) {
    if (status.available) return;
    throw new Error(
        `parity cannot run: ${status.reason}. The comparison needs the StockSharp checkout named in ` +
        'tools/csharp-catalog/csharp-catalog.csproj and a .NET SDK. This is a failure rather than a ' +
        'skip on purpose: a skipped parity test is a green tick over an unverified port.');
}

export function readDump(name) {
    return JSON.parse(readFileSync(join(cacheDir, name), 'utf8'));
}
