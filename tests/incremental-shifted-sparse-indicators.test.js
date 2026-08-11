const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { bulkOracle, bulkOracleWithTargets } = require('./runtime-series.js');

const {
    AlligatorIndicator,
    FractalsIndicator,
    GatorOscillatorIndicator,
    IchimokuIndicator,
    IndicatorRuntime,
    PeakIndicator,
    TroughIndicator,
    ZigZagIndicator,
} = require('../src/index.js');

function bars(count = 85) {
    return Array.from({ length: count }, (_, index) => {
        const close = 130 + Math.sin(index / 4.3) * 12
            + Math.cos(index / 10.7) * 3 + index * 0.06;
        return {
            time: index + 1,
            open: close - Math.sin(index / 2.1) * 0.7,
            high: close + 1.6 + (index % 6) * 0.18,
            low: close - 1.4 - (index % 5) * 0.14,
            close,
            volume: 1_200 + index * 11,
        };
    });
}

function input(bar) {
    return { time: bar.time, value: bar };
}

function oracle(source, params, outputId) {
    return bulkOracleWithTargets(IchimokuIndicator, source, params, outputId);
}

function assertOutput(runtime, outputId, expected, epsilon = 1e-9) {
    const actual = runtime.points(outputId);
    assert.equal(actual.length, expected.length, `${outputId} point count`);
    actual.forEach((point, index) => {
        const value = expected[index];
        assert.equal(point.outputId, outputId);
        assert.equal(point.sourceIndex, value.sourceIndex);
        assert.equal(point.targetIndex, value.targetIndex);
        assert.equal(point.time, value.time);
        const tolerance = Math.max(1, Math.abs(value.value)) * epsilon;
        assert.ok(
            Math.abs(point.value - value.value) <= tolerance,
            `${outputId}: ${point.value} != ${value.value} at ${point.targetIndex}`,
        );
    });
}

const OUTPUTS = ['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou'];
const PARAMS = { tenkanLength: 4, kijunLength: 7, senkouBLength: 12 };

function assertIchimoku(runtime, source) {
    for (const outputId of OUTPUTS)
        assertOutput(runtime, outputId, oracle(source, PARAMS, outputId));
}

function fractalOracle(source, length, outputId) {
    return bulkOracleWithTargets(FractalsIndicator, source, { length }, outputId);
}

function assertFractals(runtime, source, length = 5) {
    for (const outputId of ['up', 'down']) {
        const expected = fractalOracle(source, length, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, `${outputId} point count`);
        actual.forEach((point, index) => {
            const value = expected[index];
            assert.equal(point.sourceIndex, value.sourceIndex);
            assert.equal(point.targetIndex, value.targetIndex);
            assert.equal(point.time, value.time);
            assert.equal(point.value, value.value);
        });
    }
}

function zigZagOracle(source, deviation) {
    return bulkOracleWithTargets(ZigZagIndicator, source, { deviation });
}

function assertZigZag(runtime, source, deviation) {
    const expected = zigZagOracle(source, deviation);
    const actual = runtime.points('value');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        const value = expected[index];
        assert.equal(point.sourceIndex, value.sourceIndex);
        assert.equal(point.targetIndex, value.targetIndex);
        assert.equal(point.time, value.time);
        assert.equal(point.value, value.value);
    });
}

function directionalOracle(definition, source, deviation) {
    // Both indices come straight off the runtime: sourceIndex is the bar whose arithmetic
    // confirmed the pivot, targetIndex the bar it is drawn on. The batch calc expressed the same
    // thing as a `shift` field, and the batch calc is gone.
    const runtime = new IndicatorRuntime({ definition, parameters: { deviation } });
    runtime.reset(source.map((bar) => ({ time: bar.time, value: bar })));
    return runtime.points('value').map((point) => ({
        sourceIndex: point.sourceIndex,
        targetIndex: point.targetIndex,
        time: point.time,
        value: point.value,
    }));
}

function assertDirectional(runtime, definition, source, deviation) {
    const expected = directionalOracle(definition, source, deviation);
    const actual = runtime.points('value');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].sourceIndex);
        assert.equal(point.targetIndex, expected[index].targetIndex);
        assert.equal(point.time, expected[index].time);
        assert.equal(point.value, expected[index].value);
    });
}

const ALLIGATOR_PARAMS = {
    jawLength: 5,
    jawShift: 3,
    teethLength: 4,
    teethShift: 2,
    lipsLength: 3,
    lipsShift: 1,
};

function alligatorShift(outputId, params = ALLIGATOR_PARAMS) {
    return params[`${outputId}Shift`];
}

function alligatorOracle(source, params, outputId) {
    return bulkOracleWithTargets(AlligatorIndicator, source, params, outputId);
}

function assertAlligator(runtime, source, params = ALLIGATOR_PARAMS) {
    for (const outputId of ['jaw', 'teeth', 'lips']) {
        const expected = alligatorOracle(source, params, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, `${outputId} point count`);
        actual.forEach((point, index) => {
            const value = expected[index];
            assert.equal(point.sourceIndex, value.sourceIndex);
            assert.equal(point.targetIndex, value.targetIndex);
            assert.equal(point.time, value.time);
            const tolerance = Math.max(1, Math.abs(value.value)) * 1e-9;
            assert.ok(Math.abs(point.value - value.value) <= tolerance);
        });
    }
}

const GATOR_PARAMS = {
    jawLength: 5,
    jawShift: 0,
    teethLength: 4,
    teethShift: 1,
    lipsLength: 3,
    lipsShift: 0,
};

function assertGator(runtime, source, params = GATOR_PARAMS) {
    for (const outputId of ['upper', 'lower']) {
        const oracle = bulkOracle(GatorOscillatorIndicator, source, params, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, oracle.length, `${outputId} point count`);
        actual.forEach((point, index) => {
            assert.equal(point.sourceIndex, oracle[index].index);
            assert.equal(point.targetIndex, oracle[index].index);
            assert.equal(point.time, oracle[index].time);
            const tolerance = Math.max(1, Math.abs(oracle[index].value)) * 1e-9;
            assert.ok(Math.abs(point.value - oracle[index].value) <= tolerance);
        });
    }
}

describe('incremental shifted and sparse indicators', () => {

    it('aligns Gator histograms by target candle across different line shifts', () => {
        const source = bars(76);
        const runtime = new IndicatorRuntime({
            definition: GatorOscillatorIndicator,
            parameters: GATOR_PARAMS,
            checkpointInterval: 10,
        });
        for (let index = 0; index < source.length; index += 1) {
            runtime.update(input(source[index]), true);
            assertGator(runtime, source.slice(0, index + 1));
        }
    });

    it('streams Alligator lines to their exact forward targets', () => {
        const source = bars(74);
        const runtime = new IndicatorRuntime({
            definition: AlligatorIndicator,
            parameters: ALLIGATOR_PARAMS,
            checkpointInterval: 10,
        });
        for (let index = 0; index < source.length; index += 1) {
            runtime.update(input(source[index]), true);
            assertAlligator(runtime, source.slice(0, index + 1));
        }
        for (const outputId of ['jaw', 'teeth', 'lips']) {
            const shift = alligatorShift(outputId);
            const pending = runtime.points(outputId).filter((point) => point.time === null);
            assert.equal(pending.length, shift);
            assert.ok(pending.every((point) => point.targetIndex === point.sourceIndex + shift));
        }
    });

    it('matches every batch append and emits Senkou values at explicit future targets', () => {
        const source = bars();
        const runtime = new IndicatorRuntime({
            definition: IchimokuIndicator,
            parameters: PARAMS,
            checkpointInterval: 11,
        });
        for (let index = 0; index < source.length; index += 1) {
            runtime.update(input(source[index]), true);
            assertIchimoku(runtime, source.slice(0, index + 1));
        }

        const rawFirst = Math.max(PARAMS.tenkanLength, PARAMS.kijunLength) - 1;
        const first = runtime.points('senkouA')
            .find((point) => point.sourceIndex === rawFirst);
        const duplicate = runtime.points('senkouA')
            .find((point) => point.sourceIndex === rawFirst
                && point.targetIndex === rawFirst + PARAMS.kijunLength);
        assert.equal(first.targetIndex, rawFirst + PARAMS.kijunLength - 1);
        assert.equal(duplicate.targetIndex, rawFirst + PARAMS.kijunLength);
        assert.ok(runtime.points('senkouA').some((point) => point.time === null));
    });

    it('places hand-checked Fractals on pivot bars rather than confirmation bars', () => {
        const rows = [
            [1, 3], [2, 2], [5, 1], [3, 2], [1, 0],
            [0, -1], [1, -3], [0, -1], [1, 0],
        ];
        const source = rows.map(([high, low], index) => ({
            time: index + 1,
            open: (high + low) / 2,
            high,
            low,
            close: (high + low) / 2,
            volume: 0,
        }));
        const runtime = new IndicatorRuntime({
            definition: FractalsIndicator,
            parameters: { length: 5 },
        });
        runtime.reset(source.map(input));

        assert.deepEqual(runtime.points('up'), [{
            outputId: 'up',
            sourceIndex: 4,
            targetIndex: 2,
            time: source[2].time,
            value: 5,
        }]);
        assert.deepEqual(runtime.points('down'), [{
            outputId: 'down',
            sourceIndex: 8,
            targetIndex: 6,
            time: source[6].time,
            value: -3,
        }]);
    });

    it('places hand-checked ZigZag reversals on their shifted extremum bars', () => {
        const closes = [10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 8, 9, 10, 11, 12];
        const source = closes.map((close, index) => ({
            time: index + 1,
            open: close,
            high: close,
            low: close,
            close,
            volume: 0,
        }));
        const runtime = new IndicatorRuntime({
            definition: ZigZagIndicator,
            parameters: { deviation: 0.1 },
        });
        runtime.reset(source.map(input));

        assert.deepEqual(runtime.points('value'), [
            {
                outputId: 'value', sourceIndex: 5, targetIndex: 1,
                time: source[1].time, value: 13,
            },
            {
                outputId: 'value', sourceIndex: 10, targetIndex: 5,
                time: source[5].time, value: 7,
            },
        ]);
    });

    for (const testCase of [
        { definition: PeakIndicator, gap: 'high' },
        { definition: TroughIndicator, gap: 'low' },
    ]) {
        it(`${testCase.definition.name} reuses ZigZag state with exact directional parity`, () => {
            const deviation = 0.035;
            const source = bars(74);
            const runtime = new IndicatorRuntime({
                definition: testCase.definition,
                parameters: { deviation },
                checkpointInterval: 9,
            });
            for (let index = 0; index < source.length; index += 1) {
                runtime.update(input(source[index]), true);
                assertDirectional(
                    runtime,
                    testCase.definition,
                    source.slice(0, index + 1),
                    deviation,
                );
            }

            const committed = source.slice(0, 56);
            runtime.reset(committed.map(input));
            for (const delta of [5, -8, 11, -3]) {
                const probe = {
                    ...source[56],
                    high: source[56].high + delta,
                    low: source[56].low - delta,
                };
                runtime.update(input(probe), false);
                assertDirectional(runtime, testCase.definition, [...committed, probe], deviation);
                assert.equal(runtime.committedCount, committed.length);
            }

            runtime.update(input(source[56]), true);
            const finalized = [...committed, source[56]];
            assertDirectional(runtime, testCase.definition, finalized, deviation);
            const corrected = {
                ...source[26],
                high: source[26].high + 9,
                low: source[26].low - 9,
            };
            runtime.correct(26, input(corrected));
            finalized[26] = corrected;
            assertDirectional(runtime, testCase.definition, finalized, deviation);

            const withGap = bars(45);
            withGap[15] = { ...withGap[15], [testCase.gap]: Number.NaN };
            runtime.reset(withGap.map(input));
            assertDirectional(runtime, testCase.definition, withGap, deviation);

            const streaming = new IndicatorRuntime({
                definition: testCase.definition,
                parameters: { deviation },
            });
            const points = streaming.resetStreaming(committed.map(input), input(source[56]));
            const expected = directionalOracle(
                testCase.definition,
                [...committed, source[56]],
                deviation,
            );
            assert.equal(points.length, expected.length);
            points.forEach((point, index) => {
                assert.equal(point.sourceIndex, expected[index].sourceIndex);
                assert.equal(point.targetIndex, expected[index].targetIndex);
                assert.equal(point.time, expected[index].time);
                assert.equal(point.value, expected[index].value);
            });
        });
    }
});
