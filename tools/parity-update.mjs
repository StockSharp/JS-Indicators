// Rewrite tests/api/parity-exceptions.json from what the suite actually observes, then show the
// diff to review. The exceptions are data, not test code, and this is the only thing that should
// ever edit them -- by hand they drift into a wish list.
//
// A wrapper rather than an inline env assignment in package.json, because `VAR=x npm test` is not
// a thing on Windows and this repository is developed on it.

import { spawnSync } from 'node:child_process';

const env = { ...process.env, SS_PARITY_EXCEPTIONS: 'update' };
// One test file at a time: each writes its own sections back into the same JSON, and node's runner
// gives every file its own process.
const run = spawnSync('npm', ['test', '--', '--concurrency=1'], { env, stdio: 'inherit', shell: true });

console.log('\nparity exceptions rewritten — review the diff:\n  git diff tests/api/parity-exceptions.json');
// The suite is expected to fail while it is rewriting; the exit code below is about this tool.
process.exit(run.error ? 1 : 0);
