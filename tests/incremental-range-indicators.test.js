const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { bulkOracle } = require('./runtime-series.js');

const {
    AroonIndicator,
    AroonOscillatorIndicator,
    AroonOscillatorProcessor,
    AroonProcessor,
    BalanceOfMarketPowerIndicator,
    BalanceOfPowerIndicator,
    BearPowerIndicator,
    BullPowerIndicator,
    ChoppinessIndexIndicator,
    ChandeKrollStopIndicator,
    ElderRayIndicator,
    FibonacciRetracementIndicator,
    IndicatorRuntime,
    VerticalHorizontalFilterIndicator,
    VortexIndicator,
} = require('../src/index.js');

function bars(count = 75) {
    return Array.from({ length: count }, (_, index) => {
        const center = 90 + Math.round(Math.sin(index / 4.3) * 12) + (index % 9) * 0.25;
        const high = center + 2 + (index % 4 === 0 ? 1 : 0);
        const low = center - 2 - (index % 5 === 0 ? 1 : 0);
        return {
            time: index + 1,
            open: center - 0.5,
            high,
            low,
            close: center + 0.5,
            volume: 900 + index * 7,
        };
    });
}

function input(bar) {
    return { time: bar.time, value: bar };
}

function oracle(source, length, outputId) {
    return bulkOracle(AroonIndicator, source, { length }, outputId)
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertOutput(runtime, source, length, outputId) {
    const expected = oracle(source, length, outputId);
    const actual = runtime.points(outputId);
    assert.equal(actual.length, expected.length, `${outputId} point count`);
    actual.forEach((point, index) => {
        assert.equal(point.outputId, outputId);
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.equal(point.value, expected[index].value);
    });
}

function assertAroon(runtime, source, length) {
    assertOutput(runtime, source, length, 'up');
    assertOutput(runtime, source, length, 'down');
}

function oscillatorOracle(source, length) {
    return bulkOracle(AroonOscillatorIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertOscillator(runtime, source, length) {
    const expected = oscillatorOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.outputId, 'line');
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.equal(point.value, expected[index].value);
    });
}

function bopOracle(source) {
    return bulkOracle(BalanceOfPowerIndicator, source, {})
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertBalanceOfPower(runtime, source) {
    const expected = bopOracle(source);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.equal(point.value, expected[index].value);
    });
}

function marketPowerOracle(source, length) {
    return bulkOracle(BalanceOfMarketPowerIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertBalanceOfMarketPower(runtime, source, length) {
    const expected = marketPowerOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.ok(Math.abs(point.value - expected[index].value) <= 1e-12);
    });
}

function choppinessOracle(source, length) {
    return bulkOracle(ChoppinessIndexIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertChoppiness(runtime, source, length) {
    const expected = choppinessOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
        assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
    });
}

const CHANDE_KROLL_PARAMS = { period: 7, multiplier: 1.4, stopPeriod: 5 };

function chandeKrollOracle(source, outputId) {
    return bulkOracle(ChandeKrollStopIndicator, source, CHANDE_KROLL_PARAMS, outputId)
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertChandeKroll(runtime, source) {
    for (const outputId of ['longStop', 'shortStop']) {
        const expected = chandeKrollOracle(source, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, outputId);
        actual.forEach((point, index) => {
            assert.equal(point.sourceIndex, expected[index].index);
            assert.equal(point.targetIndex, expected[index].index);
            assert.equal(point.time, expected[index].time);
            const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
            assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
        });
    }
}

function elderRayOracle(source, length, outputId) {
    return bulkOracle(ElderRayIndicator, source, { length }, outputId)
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertElderRay(runtime, source, length) {
    for (const outputId of ['bull', 'bear']) {
        const expected = elderRayOracle(source, length, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, outputId);
        actual.forEach((point, index) => {
            assert.equal(point.sourceIndex, expected[index].index);
            assert.equal(point.targetIndex, expected[index].index);
            assert.equal(point.time, expected[index].time);
            const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
            assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
        });
    }
}

const FIBONACCI_OUTPUTS = ['l236', 'l382', 'l500', 'l618', 'l786'];

function fibonacciOracle(source, length, outputId) {
    return bulkOracle(FibonacciRetracementIndicator, source, { length }, outputId)
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertFibonacci(runtime, source, length) {
    for (const outputId of FIBONACCI_OUTPUTS) {
        const expected = fibonacciOracle(source, length, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, outputId);
        actual.forEach((point, index) => {
            assert.equal(point.sourceIndex, expected[index].index);
            assert.equal(point.targetIndex, expected[index].index);
            assert.equal(point.time, expected[index].time);
            const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
            assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
        });
    }
}

function vhfOracle(source, length) {
    return bulkOracle(VerticalHorizontalFilterIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertVhf(runtime, source, length) {
    const expected = vhfOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
        assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
    });
}

function vortexOracle(source, length, outputId) {
    return bulkOracle(VortexIndicator, source, { length }, outputId)
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertVortex(runtime, source, length) {
    for (const outputId of ['viPlus', 'viMinus']) {
        const expected = vortexOracle(source, length, outputId);
        const actual = runtime.points(outputId);
        assert.equal(actual.length, expected.length, outputId);
        actual.forEach((point, index) => {
            assert.equal(point.sourceIndex, expected[index].index);
            assert.equal(point.targetIndex, expected[index].index);
            assert.equal(point.time, expected[index].time);
            const tolerance = Math.max(1, Math.abs(expected[index].value)) * 1e-12;
            assert.ok(Math.abs(point.value - expected[index].value) <= tolerance);
        });
    }
}

function bearOracle(source, length) {
    return bulkOracle(BearPowerIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertBearPower(runtime, source, length) {
    const expected = bearOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.ok(Math.abs(point.value - expected[index].value) <= 1e-10);
    });
}

function bullOracle(source, length) {
    return bulkOracle(BullPowerIndicator, source, { length })
        .map((point) => ({ index: point.index, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertBullPower(runtime, source, length) {
    const expected = bullOracle(source, length);
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.ok(Math.abs(point.value - expected[index].value) <= 1e-10);
    });
}

describe('incremental range indicators', () => {

    it('Vortex Indicator preserves formed zeros for a flat range', () => {
        const source = Array.from({ length: 5 }, (_, index) => ({
            time: index + 1,
            open: 10,
            high: 10,
            low: 10,
            close: 10,
            volume: 100,
        }));
        const runtime = new IndicatorRuntime({
            definition: VortexIndicator,
            parameters: { length: 2 },
        });
        runtime.reset(source.map(input));
        assert.ok(runtime.points('viPlus').every((point) => point.value === 0));
        assert.ok(runtime.points('viMinus').every((point) => point.value === 0));
    });

    it('keeps Aroon Oscillator previews isolated from its shared kernel state', () => {
        const processor = new AroonOscillatorProcessor(3);
        const makeInput = (index, high, low, isFinal) => ({
            index,
            time: index + 1,
            value: { time: index + 1, open: 0, high, low, close: 0 },
            isFinal,
        });
        processor.process(makeInput(0, 3, 1, true));
        processor.process(makeInput(1, 5, 2, true));
        const checkpoint = processor.checkpoint();
        processor.process(makeInput(2, 9, 0, false));
        processor.process(makeInput(2, 4, 3, false));
        assert.deepEqual(processor.checkpoint(), checkpoint);
    });

    it('matches StockSharp eviction and tie semantics exactly', () => {
        const rows = [
            [5, 1], [5, 2], [4, 2], [3, 3], [5, 2],
            [2, 1], [2, 1], [6, 0], [6, 0], [4, 2],
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
            definition: AroonIndicator,
            parameters: { length: 4 },
        });
        runtime.reset(source.map(input));
        assertAroon(runtime, source, 4);
    });

    it('keeps non-final processor calls isolated from committed Aroon state', () => {
        const processor = new AroonProcessor(3);
        const makeInput = (index, high, low, isFinal) => ({
            index,
            time: index + 1,
            value: { time: index + 1, open: 0, high, low, close: 0 },
            isFinal,
        });
        processor.process(makeInput(0, 3, 1, true));
        processor.process(makeInput(1, 5, 2, true));
        const checkpoint = processor.checkpoint();
        processor.process(makeInput(2, 9, 0, false));
        processor.process(makeInput(2, 4, 3, false));
        assert.deepEqual(processor.checkpoint(), checkpoint);
    });
});
