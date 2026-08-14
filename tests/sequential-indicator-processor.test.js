const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { SequentialIndicatorProcessor } = require('../src/index.js');

class SumProcessor extends SequentialIndicatorProcessor {
    constructor() {
        super(['value', 'signal']);
        this.sum = 0;
    }

    calculate(input, commit) {
        const next = this.sum + input.value;
        if (commit) this.sum = next;
        return {
            isFormed: input.index > 0,
            values: [
                this.output('value', next, input.index),
                this.output('signal', next > 5 ? 1 : null, Math.max(0, input.index - 1)),
            ],
        };
    }

    resetState() { this.sum = 0; }
    captureState() { return Object.freeze({ sum: this.sum }); }
    restoreState(state) {
        if (state === null || typeof state !== 'object' || !Number.isFinite(state.sum))
            throw new TypeError('invalid sum state');
        this.sum = state.sum;
    }
}

class MetadataProcessor extends SequentialIndicatorProcessor {
    constructor(metadata) {
        super(['value']);
        this.metadata = metadata;
    }
    calculate(input) {
        return {
            isFormed: true,
            values: [this.output('value', Math.abs(input.value), input.index, this.metadata)],
        };
    }
    resetState() {}
    captureState() { return Object.freeze({}); }
    restoreState() {}
}

function input(index, value, isFinal) {
    return { index, time: 1_000 + index, value, isFinal };
}

describe('SequentialIndicatorProcessor', () => {
    it('previews repeatedly from committed state and advances only on final input', () => {
        const processor = new SumProcessor();
        const firstPreview = processor.process(input(0, 2, false));
        const secondPreview = processor.process(input(0, 5, false));

        assert.equal(processor.position, 0);
        assert.equal(firstPreview.values[0].value, null);
        assert.equal(secondPreview.values[0].value, null);
        assert.equal(processor.process(input(0, 3, true)).values[0].value, null);
        assert.equal(processor.position, 1);
        // A preview is never the bar an indicator forms on. The platform pushes into its buffer only
        // on a final input, so the sample that would complete the window is not in it yet.
        assert.equal(processor.process(input(1, 4, false)).values[0].value, null);
        assert.equal(processor.position, 1);
        assert.equal(processor.process(input(1, 4, true)).values[0].value, 7);
        assert.equal(processor.position, 2);
        // Once a commit has formed it, previews answer again without advancing.
        assert.equal(processor.process(input(2, 5, false)).values[0].value, 12);
        assert.equal(processor.position, 2);
    });

    it('restores versioned checkpoints and immutable target-index output', () => {
        const processor = new SumProcessor();
        processor.process(input(0, 2, true));
        const checkpoint = processor.checkpoint();
        const result = processor.process(input(1, 6, true));

        assert.equal(result.sourceIndex, 1);
        assert.equal(result.isFormed, true);
        assert.deepEqual(result.values, [
            { outputId: 'value', value: 8, targetIndex: 1 },
            { outputId: 'signal', value: 1, targetIndex: 0 },
        ]);
        assert.equal(Object.isFrozen(result), true);
        assert.equal(Object.isFrozen(result.values), true);
        assert.equal(Object.isFrozen(result.values[0]), true);

        processor.restore(checkpoint);
        assert.equal(processor.position, 1);
        assert.equal(processor.process(input(1, 1, true)).values[0].value, 3);
        processor.reset();
        assert.equal(processor.position, 0);
        assert.equal(processor.process(input(0, 1, false)).values[0].value, null);
    });

    it('masks warm-up values and latches independently formed complex outputs', () => {
        class StaggeredProcessor extends SequentialIndicatorProcessor {
            constructor() { super(['fast', 'slow']); }
            calculate(input) {
                return {
                    isFormed: input.index >= 2,
                    values: [
                        this.formedOutput('fast', input.value, input.index >= 0, input.index),
                        this.formedOutput('slow', input.value * 2, input.index >= 2, input.index),
                    ],
                };
            }
            resetState() {}
            captureState() { return Object.freeze({}); }
            restoreState() {}
        }

        const processor = new StaggeredProcessor();
        const first = processor.process(input(0, 2, true));
        assert.equal(first.isFormed, false);
        assert.deepEqual(first.values.map((value) => value.value), [2, null]);

        // The fast line stays formed even when a later calculation cannot newly form it.
        const second = processor.process(input(1, 3, true));
        assert.deepEqual(second.values.map((value) => value.value), [3, null]);
        const checkpoint = processor.checkpoint();
        assert.deepEqual(checkpoint.formedOutputs, ['fast']);

        const third = processor.process(input(2, 4, true));
        assert.equal(third.isFormed, true);
        assert.deepEqual(third.values.map((value) => value.value), [4, 8]);

        processor.restore(checkpoint);
        // Restored to a state where only 'fast' had formed. A preview cannot form 'slow' -- the
        // latch is what a preview reads, and only a commit writes it.
        const replayed = processor.process(input(2, 5, false));
        assert.deepEqual(replayed.values.map((value) => value.value), [5, null]);
        const committed = processor.process(input(2, 5, true));
        assert.deepEqual(committed.values.map((value) => value.value), [5, 10]);
    });

    it('rejects gaps, malformed values and undeclared or duplicate outputs', () => {
        const processor = new SumProcessor();
        assert.throws(() => processor.process(input(1, 1, true)), /expected input index 0/);
        assert.throws(() => processor.process({ ...input(0, 1, true), time: Number.NaN }), /time must be finite/);
        assert.equal(processor.position, 0);

        class InvalidProcessor extends SumProcessor {
            calculate() {
                return {
                    isFormed: true,
                    values: [{ outputId: 'missing', value: 1, targetIndex: 0 }],
                };
            }
        }
        assert.throws(() => new InvalidProcessor().process(input(0, 1, false)), /unknown output/);

        class DuplicateProcessor extends SumProcessor {
            calculate() {
                return {
                    isFormed: true,
                    values: [
                        { outputId: 'value', value: 1, targetIndex: 0 },
                        { outputId: 'value', value: 2, targetIndex: 0 },
                    ],
                };
            }
        }
        assert.throws(() => new DuplicateProcessor().process(input(0, 1, false)), /duplicate indicator result/);
    });

    it('owns flat immutable output metadata and rejects ambiguous painter fields', () => {
        const source = { up: true, label: 'buy', weight: 2, optional: null };
        // Final, because a preview masks the value it would carry the metadata for.
        const result = new MetadataProcessor(source).process(input(0, -7, true));
        source.up = false;

        assert.deepEqual(result.values[0], {
            outputId: 'value',
            value: 7,
            targetIndex: 0,
            metadata: { up: true, label: 'buy', weight: 2, optional: null },
        });
        assert.equal(Object.isFrozen(result.values[0].metadata), true);

        assert.throws(
            () => new MetadataProcessor([]).process(input(0, 1, false)),
            /metadata must be a flat object/,
        );
        assert.throws(
            () => new MetadataProcessor({ nested: {} }).process(input(0, 1, false)),
            /nested must be a primitive value/,
        );
        assert.throws(
            () => new MetadataProcessor({ confidence: Infinity }).process(input(0, 1, false)),
            /confidence must be finite/,
        );
        assert.throws(
            () => new MetadataProcessor({ value: 1 }).process(input(0, 1, false)),
            /key 'value' is reserved/,
        );
    });

    it('rolls a failed restore back to the previous state', () => {
        const processor = new SumProcessor();
        processor.process(input(0, 4, true));
        const before = processor.checkpoint();
        assert.throws(() => processor.restore({ version: 1, position: 0, state: { sum: NaN } }), /invalid sum state/);
        assert.deepEqual(processor.checkpoint(), before);
    });
});
