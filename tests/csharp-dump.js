// Read the StockSharp dumps that tools/parity-dump.mjs produced before node:test started.
//
// Deliberately free of try/catch: no failure on this path may be silenced. A swallowed or
// skipped error here is exactly how the parity suite used to report itself green while never
// talking to the platform.

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
 * Refuse to run a parity test without the platform dump. This is intentionally a hard failure:
 * unavailable parity is unverified parity, not a successful JS test run.
 */
export function requireDump(_t, status) {
    if (status.available) return true;
    throw new Error(
        `parity cannot run: ${status.reason}. The comparison requires the StockSharp checkout ` +
        'named in tools/csharp-catalog/csharp-catalog.csproj and a .NET SDK.');
}

export function readDump(name) {
    return JSON.parse(readFileSync(join(cacheDir, name), 'utf8'));
}
