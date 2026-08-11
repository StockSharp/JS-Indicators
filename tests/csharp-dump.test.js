const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { requireDump } = require('./csharp-dump.js');

describe('C# parity availability', () => {
    it('runs parity when the dump is available', () => {
        const skipped = [];
        const result = requireDump({ skip: (reason) => skipped.push(reason) }, { available: true });

        assert.equal(result, true);
        assert.deepEqual(skipped, []);
    });

    it('fails loudly for every unavailable environment', () => {
        const reasons = [
            'stocksharp-checkout-absent',
            'dotnet-missing',
            'dotnet-sdk-missing',
            'dumper-crashed',
        ];

        for (const reason of reasons) {
            assert.throws(
                () => requireDump({ skip: () => assert.fail('must not skip') }, {
                    available: false,
                    reason,
                }),
                new RegExp(`parity cannot run: ${reason}`),
            );
        }
    });
});
