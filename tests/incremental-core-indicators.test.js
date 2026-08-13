const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    FractalAdaptiveMovingAverageProcessor,
    IndicatorRuntime,
    JurikMovingAverageIndicator,
    McGinleyDynamicProcessor,
    MovingAverageConvergenceDivergenceIndicator,
    OptimalTrackingProcessor,
    SimpleMovingAverageIndicator,
} = require('../src/index.js');

function flatCandles(closes) {
    return closes.map((close, index) => ({
        time: index + 1, open: close, high: close, low: close, close, volume: 1,
    }));
}

function commit(processor, closes) {
    return flatCandles(closes).map((candle, index) => processor.process({
        index,
        time: candle.time,
        value: candle,
        isFinal: true,
    }).values[0].value);
}

/// A bar the platform has not committed: it never reaches Buffer, so anything the indicator
/// gates on Buffer.Count still sees the window one sample short.
function previewNext(processor, candle) {
    return processor.process({
        index: processor.position,
        time: candle.time,
        value: candle,
        isFinal: false,
    }).values[0].value;
}

function commitNext(processor, candle) {
    return processor.process({
        index: processor.position,
        time: candle.time,
        value: candle,
        isFinal: true,
    }).values[0].value;
}

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

    it('uses warm-up values internally but exposes them only after platform formation', () => {
        const source = [1, 2, 3].map((close, index) => ({
            time: index + 1, open: close, high: close, low: close, close, volume: 1,
        }));
        const average = new IndicatorRuntime({
            definition: SimpleMovingAverageIndicator,
            parameters: { length: 3 },
        });
        average.update(input(source[0]), true);
        average.update(input(source[1]), true);
        assert.deepEqual(average.points('line'), []);
        average.update(input(source[2]), true);
        assert.equal(average.points('line').length, 1);
        assert.equal(average.points('line')[0].value, 2);

        const macd = new IndicatorRuntime({
            definition: MovingAverageConvergenceDivergenceIndicator,
            parameters: { shortMaLength: 3, longMaLength: 1 },
        });
        macd.update(input(source[2]), true);
        assert.equal(macd.points('macd').length, 1);
        assert.equal(macd.points('macd')[0].value, -2);
    });

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

    it('FRAMA starts its recursion at the close of the bar that forms it', () => {
        // Chosen so the fractal dimension clamps at 2 and alpha is ~0.01: an unseeded recursion
        // would answer with a hundredth of the close instead of the close.
        const values = commit(new FractalAdaptiveMovingAverageProcessor(6), [10, 20, 10, 20, 14, 15]);
        assert.deepEqual(values.slice(0, 5), [null, null, null, null, null]);
        assert.ok(Math.abs(values[5] - 15) <= 1e-12, `${values[5]} != 15`);
    });

    it('McGinley Dynamic repeats the close while its seed average is zero', () => {
        const values = commit(new McGinleyDynamicProcessor(3), [0, 0, 0, 7, 7]);
        assert.deepEqual(values, [null, null, 0, 7, 7]);
    });

    it('FRAMA does not preview a bar its committed window has not reached', () => {
        const processor = new FractalAdaptiveMovingAverageProcessor(6);
        commit(processor, [10, 20, 10, 20, 14]);
        const forming = flatCandles([10, 20, 10, 20, 14, 15])[5];
        // Five committed closes against a window of six: the sixth bar is still forming, so the
        // platform has nothing to draw for it however complete the preview's own windows look.
        assert.equal(previewNext(processor, forming), null);
        assert.ok(Math.abs(commitNext(processor, forming) - 15) <= 1e-12);
    });

    it('Optimal Tracking waits for the committed window before previewing', () => {
        const candle = (high, low, index) => ({
            time: index + 1, open: low, high, low, close: high, volume: 1,
        });
        const processor = new OptimalTrackingProcessor(2);
        assert.equal(commitNext(processor, candle(110, 90, 0)), null);
        // One committed bar against a window of two: a forming bar never reaches the platform's
        // buffer, so the indicator is still warming up and draws nothing.
        const forming = candle(120, 100, 1);
        assert.equal(previewNext(processor, forming), null);
        assert.ok(Math.abs(commitNext(processor, forming) - 101.04652453258429) <= 1e-9);
    });
});
