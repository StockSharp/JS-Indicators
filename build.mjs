// Build the published package:
//   dist/esm/**            — typed ESM modules (tsc), the npm `main`/`exports` entry
//   dist/types/**          — .d.ts + declaration maps, the npm `types` entry
//   dist/ssindicators.js   — the same code as the IIFE global `SSIndicators`, for a
//                            <script> tag or unpkg/jsdelivr with no bundler involved
//
//   npm install   # once, to get esbuild + typescript
//   node build.mjs
import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

// Fixed child of this repository, never a caller-provided path.
await rm(dist, { recursive: true, force: true });

// Typed ESM + .d.ts for npm consumers (tsc drives the public graph from index.ts).
await execFileAsync(
    process.execPath,
    [join(here, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', join(here, 'tsconfig.build.json')],
    { cwd: here },
);

await build({
    entryPoints: [join(here, 'src', 'index.ts')],
    outfile: join(dist, 'ssindicators.js'),
    globalName: 'SSIndicators',
    bundle: true,
    format: 'iife',
    sourcemap: true,
    target: 'es2020',
    logLevel: 'info',
});
console.log('built ' + join(dist, 'ssindicators.js'));

// Build-integrity guard. The indicator registry is filled by load-time
// `registerIndicator(...)` side effects; a wrong package.json "sideEffects" makes a bundler
// tree-shake them away and silently empties the catalogue — every lookup returns undefined
// while every unit test still passes, because tests import the definitions directly and
// nothing is tree-shaken there. So assert it on the bundle, where it can actually happen.
const MIN_INDICATOR_REGISTRATIONS = 50;
const bundle = join(dist, 'ssindicators.js');
const registrations = (readFileSync(bundle, 'utf8').match(/registerIndicator\(/g) || []).length;
if (registrations < MIN_INDICATOR_REGISTRATIONS) {
    throw new Error(
        `build guard: ssindicators.js has only ${registrations} registerIndicator() calls `
        + `(expected >= ${MIN_INDICATOR_REGISTRATIONS}). Indicator definitions were tree-shaken `
        + `away — check the package.json "sideEffects" field.`,
    );
}
console.log(`guard ok: ssindicators.js keeps ${registrations} indicator registrations`);
