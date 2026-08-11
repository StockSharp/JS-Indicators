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

    it('names and skips only the three supported unavailable environments', () => {
        const reasons = [
            'stocksharp-checkout-absent',
            'dotnet-missing',
            'dotnet-sdk-missing',
        ];

        for (const reason of reasons) {
            const skipped = [];
            const result = requireDump({ skip: (message) => skipped.push(message) }, {
                available: false,
                reason,
            });

            assert.equal(result, false);
            assert.deepEqual(skipped, [`StockSharp .NET dump unavailable: ${reason}`]);
        }
    });

    it('fails loudly for every unsupported unavailable reason', () => {
        assert.throws(
            () => requireDump({ skip: () => assert.fail('must not skip') }, {
                available: false,
                reason: 'dumper-crashed',
            }),
            /unsupported reason: dumper-crashed/);
    });
});
