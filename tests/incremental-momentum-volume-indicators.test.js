const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { bulkOracle } = require('./runtime-series.js');

const {
    DeMarkerProcessor,
    DemandIndexIndicator,
    DemandIndexProcessor,
    DisparityIndexProcessor,
    DynamicZonesRsiProcessor,
    IndicatorRuntime,
    PercentageVolumeOscillatorIndicator,
    PriceVolumeTrendProcessor,
    StochasticKIndicator,
    TwiggsMoneyFlowProcessor,
    UltimateOscillatorIndicator,
    VolumeIndicatorProcessor,
} = require('../src/index.js');

function bars(count = 72) {
    return Array.from({ length: count }, (_, index) => {
        const close = 90 + Math.sin(index / 3.7) * 9 + Math.cos(index / 8.3) * 4 + index * 0.11;
        return {
            time: index + 1,
            open: close - Math.sin(index) * 0.7,
            high: close + 1.2 + (index % 4) * 0.17,
            low: close - 1.1 - (index % 5) * 0.13,
            close,
            volume: 800 + (index % 11) * 73 + index * 5,
        };
    });
}

function input(bar) {
    return { time: bar.time, value: bar };
}

function finiteOracle(definition, source, params) {
    return bulkOracle(definition, source, params);
}

function assertPoints(runtime, outputId, expected) {
    const actual = runtime.points(outputId);
    assert.equal(actual.length, expected.length);
    actual.forEach((point, index) => {
        const oracle = expected[index];
        assert.equal(point.outputId, outputId);
        assert.equal(point.sourceIndex, oracle.index);
        assert.equal(point.targetIndex, oracle.index);
        assert.equal(point.time, oracle.time);
        assert.deepEqual(point.metadata, oracle.metadata);
        const tolerance = Math.max(1, Math.abs(oracle.value)) * 1e-10;
        assert.ok(
            Math.abs(point.value - oracle.value) <= tolerance,
            `${point.value} != ${oracle.value} at ${point.targetIndex}`,
        );
    });
}

function pvoSeries(outputId) {
    return (source, params) => bulkOracle(PercentageVolumeOscillatorIndicator, source, params, outputId);
}

describe('incremental momentum and volume indicators', () => {

    it('DeMarker keeps the first valid candle as a seed and previews flat fallback safely', () => {
        const processor = new DeMarkerProcessor(2);
        const flat = { time: 1, open: 5, high: 6, low: 4, close: 5, volume: 100 };
        const process = (index, isFinal) => processor.process({
            index,
            time: index + 1,
            value: { ...flat, time: index + 1 },
            isFinal,
        });

        assert.equal(process(0, false).values[0].value, null);
        assert.equal(processor.position, 0);
        assert.equal(process(0, true).values[0].value, null);
        assert.equal(process(1, true).values[0].value, null);
        assert.equal(process(2, false).values[0].value, 0.5);
        assert.equal(processor.position, 2);
        assert.equal(process(2, true).values[0].value, 0.5);
    });

    it('Dynamic Zones RSI handles a flat formed RSI range without mutating previews', () => {
        const processor = new DynamicZonesRsiProcessor(2, 20, 80);
        const candle = index => ({
            time: index + 1,
            open: index + 1,
            high: index + 1,
            low: index + 1,
            close: index + 1,
        });
        for (let index = 0; index < 3; index += 1) {
            processor.process({
                index, time: index + 1, value: candle(index), isFinal: true,
            });
        }
        const preview = processor.process({
            index: 3, time: 4, value: candle(3), isFinal: false,
        });
        assert.equal(preview.values[0].value, 0);
        assert.equal(processor.position, 3);
        assert.equal(processor.process({
            index: 3, time: 4, value: candle(3), isFinal: true,
        }).values[0].value, 0);
    });

    it('Demand Index repeats its last value without advancing a zero-delta anchor', () => {
        const processor = new DemandIndexProcessor(1);
        const source = [
            { time: 1, open: 10, high: 10, low: 10, close: 10, volume: 100 },
            { time: 2, open: 12, high: 12, low: 12, close: 12, volume: 120 },
            { time: 3, open: 12, high: 12, low: 12, close: 12, volume: 140 },
            { time: 4, open: 15, high: 15, low: 15, close: 15, volume: 150 },
        ];
        const actual = source.map((bar, index) => processor.process({
            index,
            time: bar.time,
            value: bar,
            isFinal: true,
        }).values[0].value);
        const expected = bulkOracle(DemandIndexIndicator, source, { length: 1 }, 'map')(point => point.value);
        actual.forEach((value, index) => {
            if (expected[index] === null) assert.equal(value, null);
            else assert.ok(Math.abs(value - expected[index]) <= Number.EPSILON * 2);
        });
        assert.equal(actual[2], actual[1]);
    });

    it('Disparity Index emits a gap instead of a non-finite zero-average ratio', () => {
        const processor = new DisparityIndexProcessor(2);
        const closes = [-1, 1];
        const results = closes.map((close, index) => processor.process({
            index,
            time: index + 1,
            value: { time: index + 1, open: close, high: close, low: close, close },
            isFinal: true,
        }));
        assert.equal(results[1].values[0].value, null);
    });

    it('Stochastic K returns zero for a formed flat range without mutating previews', () => {
        const flat = Array.from({ length: 4 }, (_, index) => ({
            time: index + 1,
            open: 5,
            high: 5,
            low: 5,
            close: 5,
            volume: 100,
        }));
        const runtime = new IndicatorRuntime({
            definition: StochasticKIndicator,
            parameters: { length: 3 },
        });
        runtime.reset(flat.slice(0, 3).map(input));
        assert.deepEqual(runtime.points('line').map((point) => point.value), [0]);

        for (let iteration = 0; iteration < 3; iteration += 1) {
            runtime.update(input(flat[3]), false);
            assert.deepEqual(runtime.points('line').map((point) => point.value), [0, 0]);
            assert.equal(runtime.committedCount, 3);
        }
        runtime.update(input(flat[3]), true);
        assert.deepEqual(runtime.points('line').map((point) => point.value), [0, 0]);
    });

    it('Percentage Volume Oscillator emits zero for a formed zero-volume denominator', () => {
        const source = Array.from({ length: 6 }, (_, index) => ({
            time: index + 1,
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 0,
        }));
        const runtime = new IndicatorRuntime({
            definition: PercentageVolumeOscillatorIndicator,
            parameters: { shortPeriod: 2, longPeriod: 3 },
        });
        runtime.reset(source.map(input));
        assert.equal(runtime.points('shortEma')[0].sourceIndex, 1);
        assert.equal(runtime.points('longEma')[0].sourceIndex, 2);
        assert.equal(runtime.points('pvo')[0].sourceIndex, 2);
        assert.ok(runtime.points('pvo').every((point) => point.value === 0));
    });

    it('Price Volume Trend preserves StockSharp zero-close seed semantics', () => {
        const processor = new PriceVolumeTrendProcessor();
        const source = [
            { time: 1, open: 10, high: 10, low: 10, close: 10, volume: 100 },
            { time: 2, open: 0, high: 0, low: 0, close: 0, volume: 50 },
            { time: 3, open: 5, high: 5, low: 5, close: 5, volume: 200 },
            { time: 4, open: 6, high: 6, low: 6, close: 6, volume: 30 },
        ];
        const results = source.map((bar, index) => processor.process({
            index,
            time: bar.time,
            value: bar,
            isFinal: true,
        }));
        assert.deepEqual(
            results.map((result) => result.values[0].value),
            [null, -50, null, -44],
        );
    });

    it('Twiggs Money Flow reuses only committed AD on a flat-candle preview', () => {
        const processor = new TwiggsMoneyFlowProcessor(1);
        const first = { time: 1, open: 5, high: 10, low: 0, close: 10, volume: 90 };
        const falling = { time: 2, open: 5, high: 10, low: 0, close: 0, volume: 90 };
        const flat = { time: 2, open: 5, high: 5, low: 5, close: 5, volume: 60 };
        processor.process({ index: 0, time: first.time, value: first, isFinal: true });
        processor.process({ index: 1, time: falling.time, value: falling, isFinal: false });
        const preview = processor.process({
            index: 1,
            time: flat.time,
            value: flat,
            isFinal: false,
        });
        assert.ok(Math.abs(preview.values[0].value - 0.5) <= Number.EPSILON);
        assert.equal(processor.position, 1);
    });

    it('Ultimate Oscillator preserves a formed zero on continuous down moves', () => {
        const source = [];
        let previous = 200;
        for (let index = 0; index < 35; index += 1) {
            const close = previous - 2;
            source.push({
                time: index + 1,
                open: previous,
                high: previous,
                low: close,
                close,
                volume: 100,
            });
            previous = close;
        }
        const runtime = new IndicatorRuntime({
            definition: UltimateOscillatorIndicator,
            parameters: {},
        });
        runtime.reset(source.map(input));
        assert.equal(runtime.points('line')[0].sourceIndex, 28);
        assert.ok(runtime.points('line').every((point) => point.value === 0));
    });

    it('uses neutral upward coloring when candle direction is unavailable', () => {
        const processor = new VolumeIndicatorProcessor();
        const preview = processor.process({
            index: 0,
            time: 1,
            value: { time: 1, open: Number.NaN, high: 2, low: 0, close: 1, volume: 50 },
            isFinal: false,
        });
        assert.equal(processor.position, 0);
        assert.deepEqual(preview.values[0], {
            outputId: 'value',
            value: 50,
            targetIndex: 0,
            metadata: { up: true },
        });
    });
});
