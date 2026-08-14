const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { bulkOracle } = require('./runtime-series.js');

const {
    CommodityChannelIndexProcessor,
    DeMarkerProcessor,
    DemandIndexIndicator,
    DemandIndexProcessor,
    DisparityIndexProcessor,
    DynamicZonesRsiProcessor,
    CompositeMomentumProcessor,
    getIndicatorDefinition,
    IndicatorRuntime,
    MarketMeannessIndexProcessor,
    WaveTrendOscillatorProcessor,
    WoodiesCciProcessor,
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

function flatCandle(close, index) {
    return { time: index + 1, open: close, high: close, low: close, close, volume: 1 };
}

function commitCloses(processor, closes) {
    return closes.map((close, index) => processor.process({
        index,
        time: index + 1,
        value: flatCandle(close, index),
        isFinal: true,
    }).values[0].value);
}

/// One bar of a still-forming candle. The platform never pushes it into a buffer, so every
/// window the indicator reads is the one the last commit left behind.
function previewClose(processor, close) {
    const index = processor.position;
    const result = processor.process({
        index,
        time: index + 1,
        value: flatCandle(close, index),
        isFinal: false,
    });
    return Object.fromEntries(result.values.map((value) => [value.outputId, value.value]));
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
        assert.equal(process(2, false).values[0].value, null);
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
        const expected = new Array(source.length).fill(null);
        for (const point of bulkOracle(DemandIndexIndicator, source, { length: 1 }, 'line'))
            expected[point.index] = point.value;
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

    it('Market Meanness Index unwinds an evicted step against its own successor', () => {
        // The flat step 2 -> 2 reverses the rise before it, so the window of three carries one
        // direction change. Evicting 1 -> 2 takes that change with it, leaving none behind.
        assert.deepEqual(
            commitCloses(new MarketMeannessIndexProcessor(3), [1, 2, 2, 3]),
            [null, null, 100, 0],
        );
    });

    it('Market Meanness Index counts no direction change in a two-price window', () => {
        // One price step has nothing to reverse, however often the direction flips bar to bar.
        assert.deepEqual(
            commitCloses(new MarketMeannessIndexProcessor(2), [1, 2, 1, 2, 1]),
            [null, 0, 0, 0, 0],
        );
    });

    it('Commodity Channel Index prices a preview against the window it previews', () => {
        const processor = new CommodityChannelIndexProcessor(3);
        commitCloses(processor, [10, 20, 30]);
        // The preview window is 20, 30, 40 -- mean 30, mean deviation 20/3 -- not the committed
        // 10, 20, 30 the platform has already rolled off.
        const preview = processor.process({
            index: 3,
            time: 4,
            value: flatCandle(40, 3),
            isFinal: false,
        });
        assert.ok(Math.abs(preview.values[0].value - 100) <= 1e-9, `${preview.values[0].value} != 100`);
    });

    it('Woodies CCI waits for the committed window before previewing its CCI line', () => {
        const processor = new WoodiesCciProcessor(3, 6);
        commitCloses(processor, [10, 20]);
        // Two committed typical prices against a window of three. The platform's CCI is not
        // formed, and a complex indicator in sequence mode stops there: neither line is drawn.
        assert.deepEqual(previewClose(processor, 30), { cci: null, signal: null });
    });

    it('Composite Momentum previews its ROC legs against the base the platform keeps', () => {
        const lengths = [1, 1, 1, 1, 1, 1];
        const processor = new CompositeMomentumProcessor(...lengths);
        commitCloses(processor, [100, 200, 100]);
        // A forming bar is never pushed, so both ROC legs still measure from the close two bars
        // back (200), not from the one bar back (100) a committed bar would have evicted it for.
        const preview = previewClose(processor, 150);
        assert.ok(Math.abs(preview.composite - 12.5) <= 1e-9, `${preview.composite} != 12.5`);
        assert.ok(Math.abs(preview.sma - 12.5) <= 1e-9, `${preview.sma} != 12.5`);
    });

    it('Wave Trend previews WT2 with the oldest sample already gone', () => {
        const closes = [10, 40, 12, 44, 14, 48, 16, 52];
        const processor = new WaveTrendOscillatorProcessor(2, 2, 3);
        const committed = [];
        // Stop as soon as WT2's window of three holds two samples: that is the state where the
        // platform's SumNoFirst and a "drop only once full" eviction give different answers.
        for (const close of closes) {
            if (committed.length === 2) break;
            const index = processor.position;
            const wt1 = processor.process({
                index,
                time: index + 1,
                value: flatCandle(close, index),
                isFinal: true,
            }).values.find((value) => value.outputId === 'wt1').value;
            if (wt1 !== null) committed.push(wt1);
        }
        assert.equal(committed.length, 2);

        const preview = previewClose(processor, 20);
        // StockSharp's SMA previews with Buffer.SumNoFirst: the oldest sample leaves the sum
        // whether or not the window has filled, and the divisor stays the full period.
        const expected = (committed.slice(1).reduce((sum, value) => sum + value, 0)
            + preview.wt1) / 3;
        assert.ok(Math.abs(preview.wt2 - expected) <= 1e-9, `${preview.wt2} != ${expected}`);
    });

    it('draws nothing where the platform divides by a decimal zero', () => {
        // Every case below sums to exactly zero in decimal and to arithmetic noise in double, so
        // an exact `=== 0` guard misses and the division returns the residual over itself.
        const line = (kind, params, bars, outputId = 'line') => {
            const runtime = new IndicatorRuntime({
                definition: getIndicatorDefinition(kind),
                parameters: params,
            });
            runtime.reset(bars.map((bar, index) => ({ time: index + 1, value: bar })));
            return runtime.points(outputId).map((point) => point.value);
        };
        const flat = (closes) => closes.map((close, index) => flatCandle(close, index));

        // 0.7 + 0.1 - 0.8: the window's prices cancel, so there is no centre of gravity.
        assert.deepEqual(
            line('CenterOfGravityOscillator', { length: 3 }, flat([5, 4, 0.7, 0.1, -0.8])),
            [-0.44329896907216493, -0.8125],
        );
        // 0.1 + 0.2 - 0.3: nothing to express a distance from.
        assert.deepEqual(line('DisparityIndex', { length: 3 }, flat([0.1, 0.2, -0.3])), []);
        // A zero long average is the platform's own zero case, and it answers zero rather than null.
        assert.deepEqual(
            line('PercentagePriceOscillator', { shortPeriod: 1, longPeriod: 3 },
                flat([10.1, 20.2, -30.3]), 'ppo'),
            [0],
        );
        // A price that never moves has no deviation to divide by.
        assert.deepEqual(
            line('WaveTrendOscillator', { esaPeriod: 10, dPeriod: 14, averagePeriod: 3 },
                flat(Array.from({ length: 30 }, () => 100.1)), 'wt1'),
            [],
        );
        // Two candles whose typical price is the same decimal but different doubles: still flat.
        const sameTypical = [[10.05, 10.01, 10.03], [10.03, 10.03, 10.03]];
        assert.deepEqual(
            line('CommodityChannelIndex', { length: 3 },
                Array.from({ length: 4 }, (_, index) => {
                    const [high, low, close] = sameTypical[index % 2];
                    return { time: index + 1, open: close, high, low, close, volume: 1 };
                })),
            [],
        );
        // A zero close is no denominator for a percentage, at length 1 as at any other.
        assert.deepEqual(line('ForecastOscillator', { length: 1 }, flat([100, 0])), [0]);
    });

    it('lets Chaikin volatility reach the zero the platform reaches', () => {
        const bars = [
            { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 1 },
            ...Array.from({ length: 70 }, (_, index) => ({
                time: index + 2, open: 100, high: 100, low: 100, close: 100, volume: 1,
            })),
        ];
        const runtime = new IndicatorRuntime({
            definition: getIndicatorDefinition('ChaikinVolatility'),
            parameters: { emaLength: 2, rocLength: 3 },
        });
        runtime.reset(bars.map((bar, index) => ({ time: index + 1, value: bar })));
        const points = runtime.points('line');
        // The average of a zero range decays by a third a bar and decimal reaches zero, after
        // which the rate of change has no base left to divide by and the line simply stops.
        assert.ok(points.length > 0 && points.length < bars.length - 4,
            `expected the line to stop, got ${points.length} of ${bars.length} bars`);
        assert.equal(points[points.length - 1].value, -100);
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
            value: null,
            targetIndex: 0,
            metadata: { up: true },
        });
    });
});
