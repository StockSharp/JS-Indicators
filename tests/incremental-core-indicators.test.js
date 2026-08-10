const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    IndicatorRuntime,
    JurikMovingAverageIndicator,
} = require('../src/index.js');

function bars(count = 80) {
    return Array.from({ length: count }, (_, index) => {
        const close = 100 + Math.sin(index / 5) * 8 + index * 0.09;
        return {
            time: index + 1,
            open: close - 0.4,
            high: close + 1 + (index % 4) * 0.15,
            low: close - 1 - (index % 3) * 0.12,
            close,
            volume: 1_000 + index * 7,
        };
    });
}

function input(bar) {
    return { time: bar.time, value: bar };
}

/// What the same indicator produces when the whole history is handed over at once. The oracle used
/// to be the batch calc in src/calc, which the chart never ran and which is gone; the property
/// worth keeping was never "the two implementations agree" but "one bar at a time gives what all
/// the bars at once give", and that is asked of the implementation the chart actually uses.
function finiteOracle(definition, source, params) {
    const runtime = new IndicatorRuntime({ definition, parameters: params });
    runtime.reset(source.map((bar) => ({ time: bar.time, value: bar })));
    return runtime.points('line')
        .map((point) => ({ index: point.sourceIndex, time: point.time, value: point.value }))
        .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value));
}

function assertPoints(runtime, expected, epsilon = 1e-10) {
    const actual = runtime.points('line');
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        assert.equal(point.outputId, 'line');
        assert.equal(point.sourceIndex, expected[index].index);
        assert.equal(point.targetIndex, expected[index].index);
        assert.equal(point.time, expected[index].time);
        assert.ok(
            Math.abs(point.value - expected[index].value) <= epsilon,
            `${point.value} != ${expected[index].value} at ${point.targetIndex}`,
        );
    });
}

describe('core incremental indicator definitions', () => {

    it('Jurik Moving Average preserves warm-up position across invalid closes', () => {
        const source = bars(10);
        source[2] = { ...source[2], close: Number.NaN };
        const parameters = { length: 5, phase: 0 };
        const runtime = new IndicatorRuntime({
            definition: JurikMovingAverageIndicator,
            parameters,
            checkpointInterval: 3,
        });
        runtime.reset(source.map(input));
        assertPoints(runtime, finiteOracle(JurikMovingAverageIndicator, source, parameters));
    });
});
