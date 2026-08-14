// Public API module: index.d.ts
export type { CandlestickData, LineStyleValue, Time } from './types.js';
export * from './indicator-definition.js';
export * from './indicator-registry.js';
export * from './sequential-processor.js';
export * from './indicator-runtime.js';
export * from './indicator-source.js';
export * from './indicator-output-style.js';
export * from './indicator-taxonomy.js';
export * from './math/index.js';
export * from './calc/index.js';
export * from './indicator-catalog.js';

// Public API module: calc/acceleration.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface AccelerationParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly smaLength: number;
}
export interface AccelerationCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
    readonly average: RollingWindowCheckpoint;
}
export declare class AccelerationProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AccelerationCheckpoint> {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly smaLength: number;
    private readonly short;
    private readonly long;
    private readonly average;
    constructor(shortMaLength: number, longMaLength: number, smaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AccelerationCheckpoint;
    protected restoreState(state: AccelerationCheckpoint): void;
}
export declare const AccelerationIndicator: IndicatorDefinition<IndicatorCandle, AccelerationParameters>;

// Public API module: calc/accumulationdistributionline.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface AccumulationDistributionLineCheckpoint {
    readonly value: number;
}
export declare class AccumulationDistributionLineProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AccumulationDistributionLineCheckpoint> {
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AccumulationDistributionLineCheckpoint;
    protected restoreState(state: AccumulationDistributionLineCheckpoint): void;
}
export declare const AccumulationDistributionLineIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/adaptivelaguerrefilter.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface AdaptiveLaguerreFilterParameters extends IndicatorParameters {
    readonly gamma: number;
}
export interface AdaptiveLaguerreFilterCheckpoint {
    readonly l0: number;
    readonly l1: number;
    readonly l2: number;
    readonly l3: number;
    readonly formed: boolean;
}
export declare class AdaptiveLaguerreFilterProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AdaptiveLaguerreFilterCheckpoint> {
    readonly gamma: number;
    private l0;
    private l1;
    private l2;
    private l3;
    private formed;
    constructor(gamma: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AdaptiveLaguerreFilterCheckpoint;
    protected restoreState(state: AdaptiveLaguerreFilterCheckpoint): void;
}
export declare const AdaptiveLaguerreFilterIndicator: IndicatorDefinition<IndicatorCandle, AdaptiveLaguerreFilterParameters>;

// Public API module: calc/adaptivepricezone.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint, type SeededMovingAverageCheckpoint } from '../math/index.js';
export interface AdaptivePriceZoneParameters extends IndicatorParameters {
    readonly period: number;
    readonly bandPercentage: number;
}
export interface AdaptivePriceZoneCheckpoint {
    readonly average: SeededMovingAverageCheckpoint;
    readonly deviation: RollingWindowCheckpoint;
}
export declare class AdaptivePriceZoneProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AdaptivePriceZoneCheckpoint> {
    readonly period: number;
    readonly bandPercentage: number;
    private readonly average;
    private readonly deviation;
    constructor(period: number, bandPercentage: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AdaptivePriceZoneCheckpoint;
    protected restoreState(state: AdaptivePriceZoneCheckpoint): void;
}
export declare const AdaptivePriceZoneIndicator: IndicatorDefinition<IndicatorCandle, AdaptivePriceZoneParameters>;

// Public API module: calc/alligator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SmoothedMovingAverageCheckpoint } from '../math/index.js';
import { AlligatorParameters } from './shared/shifted-sparse.js';
export interface AlligatorCheckpoint {
    readonly jaw: SmoothedMovingAverageCheckpoint;
    readonly teeth: SmoothedMovingAverageCheckpoint;
    readonly lips: SmoothedMovingAverageCheckpoint;
}
export declare class AlligatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AlligatorCheckpoint> {
    readonly jawLength: number;
    readonly jawShift: number;
    readonly teethLength: number;
    readonly teethShift: number;
    readonly lipsLength: number;
    readonly lipsShift: number;
    private readonly jaw;
    private readonly teeth;
    private readonly lips;
    constructor(jawLength: number, jawShift: number, teethLength: number, teethShift: number, lipsLength: number, lipsShift: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AlligatorCheckpoint;
    protected restoreState(state: AlligatorCheckpoint): void;
}
export declare const AlligatorIndicator: IndicatorDefinition<IndicatorCandle, AlligatorParameters>;

// Public API module: calc/approvalflowindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface ApprovalFlowIndexCheckpoint {
    readonly previousClose: number;
    readonly totalUp: number;
    readonly totalDown: number;
    readonly count: number;
    readonly formed: boolean;
}
export declare class ApprovalFlowIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ApprovalFlowIndexCheckpoint> {
    readonly length: number;
    private previousClose;
    private totalUp;
    private totalDown;
    private count;
    private formed;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ApprovalFlowIndexCheckpoint;
    protected restoreState(state: ApprovalFlowIndexCheckpoint): void;
}
export declare const ApprovalFlowIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/arnaudlegouxmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface ArnaudLegouxMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly offset: number;
    readonly sigma: number;
}
export declare function resolvedNumber(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number;
export declare function almaWeights(length: number, offset: number, sigma: number): readonly number[];
export declare class ArnaudLegouxMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    readonly offset: number;
    readonly sigma: number;
    private readonly average;
    constructor(length: number, offset: number, sigma: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const ArnaudLegouxMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, ArnaudLegouxMovingAverageParameters>;

// Public API module: calc/aroon.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { AroonCheckpoint, RangeLengthParameters } from './shared/range.js';
export declare class AroonProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AroonCheckpoint> {
    readonly length: number;
    private readonly aroon;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AroonCheckpoint;
    protected restoreState(state: AroonCheckpoint): void;
}
export declare const AroonIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/aroonoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { AroonCheckpoint, RangeLengthParameters } from './shared/range.js';
export declare class AroonOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AroonCheckpoint> {
    readonly length: number;
    private readonly aroon;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AroonCheckpoint;
    protected restoreState(state: AroonCheckpoint): void;
}
export declare const AroonOscillatorIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/averagedirectionalindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type ExpandingWilderMovingAverageCheckpoint } from '../math/index.js';
import { DirectionalMovementCheckpoint, RecursiveLengthParameters } from './shared/recursive-statistical.js';
export interface AverageDirectionalIndexCheckpoint extends DirectionalMovementCheckpoint {
    readonly average: ExpandingWilderMovingAverageCheckpoint;
}
export declare class AverageDirectionalIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AverageDirectionalIndexCheckpoint> {
    readonly length: number;
    private readonly directional;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AverageDirectionalIndexCheckpoint;
    protected restoreState(state: AverageDirectionalIndexCheckpoint): void;
}
export declare const AverageDirectionalIndexIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/averagetruerange.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type AverageTrueRangeCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class AverageTrueRangeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AverageTrueRangeCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AverageTrueRangeCheckpoint;
    protected restoreState(state: AverageTrueRangeCheckpoint): void;
}
export declare const AverageTrueRangeIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/awesomeoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface AwesomeOscillatorParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
}
export interface AwesomeOscillatorCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
    readonly previous: number | null;
}
export declare class AwesomeOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, AwesomeOscillatorCheckpoint> {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    private readonly short;
    private readonly long;
    private previous;
    constructor(shortMaLength: number, longMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): AwesomeOscillatorCheckpoint;
    protected restoreState(state: AwesomeOscillatorCheckpoint): void;
}
export declare const AwesomeOscillatorIndicator: IndicatorDefinition<IndicatorCandle, AwesomeOscillatorParameters>;

// Public API module: calc/balanceofmarketpower.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export declare class BalanceOfMarketPowerProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const BalanceOfMarketPowerIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/balanceofpower.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class BalanceOfPowerProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const BalanceOfPowerIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/balancevolume.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface BalanceVolumeCheckpoint {
    readonly seeded: boolean;
    readonly previousClose: number;
    readonly cumulative: number;
}
export declare class BalanceVolumeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, BalanceVolumeCheckpoint> {
    private seeded;
    private previousClose;
    private cumulative;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): BalanceVolumeCheckpoint;
    protected restoreState(state: BalanceVolumeCheckpoint): void;
}
export declare const BalanceVolumeIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/bearpower.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export declare class BearPowerProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SeededMovingAverageCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SeededMovingAverageCheckpoint;
    protected restoreState(state: SeededMovingAverageCheckpoint): void;
}
export declare const BearPowerIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/bollingerbands.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { BollingerBandsCheckpoint } from './shared/compound.js';
export interface BollingerBandsParameters extends IndicatorParameters {
    readonly length: number;
    readonly width: number;
    readonly upBandWidth: number;
    readonly lowBandWidth: number;
}
export declare class BollingerBandsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, BollingerBandsCheckpoint> {
    readonly length: number;
    readonly width: number;
    readonly upBandWidth: number;
    readonly lowBandWidth: number;
    private readonly average;
    private readonly deviation;
    constructor(length: number, width: number, upBandWidth: number, lowBandWidth: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): BollingerBandsCheckpoint;
    protected restoreState(state: BollingerBandsCheckpoint): void;
}
export declare const BollingerBandsIndicator: IndicatorDefinition<IndicatorCandle, BollingerBandsParameters>;

// Public API module: calc/bollingerpercentb.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { BollingerBandsCheckpoint } from './shared/compound.js';
export interface BollingerPercentBParameters extends IndicatorParameters {
    readonly length: number;
    readonly stdDevMultiplier: number;
}
export declare class BollingerPercentBProcessor extends SequentialIndicatorProcessor<IndicatorCandle, BollingerBandsCheckpoint> {
    readonly length: number;
    readonly stdDevMultiplier: number;
    private readonly average;
    private readonly deviation;
    constructor(length: number, stdDevMultiplier: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): BollingerBandsCheckpoint;
    protected restoreState(state: BollingerBandsCheckpoint): void;
}
export declare const BollingerPercentBIndicator: IndicatorDefinition<IndicatorCandle, BollingerPercentBParameters>;

// Public API module: calc/bullpower.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export declare class BullPowerProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SeededMovingAverageCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SeededMovingAverageCheckpoint;
    protected restoreState(state: SeededMovingAverageCheckpoint): void;
}
export declare const BullPowerIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/centerofgravityoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { CycleLengthParameters } from './shared/cycle.js';
export interface CenterOfGravityCheckpoint {
    readonly sum: RollingWindowCheckpoint;
    readonly weighted: RollingWindowCheckpoint;
}
export declare class CenterOfGravityOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, CenterOfGravityCheckpoint> {
    readonly length: number;
    private readonly sum;
    private readonly weighted;
    private readonly divisor;
    private readonly center;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): CenterOfGravityCheckpoint;
    protected restoreState(state: CenterOfGravityCheckpoint): void;
}
export declare const CenterOfGravityOscillatorIndicator: IndicatorDefinition<IndicatorCandle, CycleLengthParameters>;

// Public API module: calc/chaikinmoneyflow.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface ChaikinMoneyFlowCheckpoint {
    readonly moneyFlowVolumes: RingBufferCheckpoint<number | null>;
    readonly moneyFlowVolumeSum: number;
    readonly volumeSum: number;
    readonly invalid: number;
}
/**
 * StockSharp-compatible CMF, including its historical denominator-eviction
 * behavior: an expired money-flow volume is subtracted from both sums.
 */
export declare class ChaikinMoneyFlowProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ChaikinMoneyFlowCheckpoint> {
    readonly length: number;
    private readonly moneyFlowVolumes;
    private moneyFlowVolumeSum;
    private volumeSum;
    private invalid;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ChaikinMoneyFlowCheckpoint;
    protected restoreState(state: ChaikinMoneyFlowCheckpoint): void;
}
export declare const ChaikinMoneyFlowIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/chaikinvolatility.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
export interface ChaikinVolatilityParameters extends IndicatorParameters {
    readonly emaLength: number;
    readonly rocLength: number;
}
export interface ChaikinVolatilityCheckpoint {
    readonly averageCount: number;
    readonly averageSeedSum: number;
    readonly averageFormed: boolean;
    readonly averagePrevious: number;
    readonly history: RingBufferCheckpoint<number | null>;
}
export interface AverageEvaluation {
    readonly count: number;
    readonly seedSum: number;
    readonly formed: boolean;
    readonly previous: number;
    readonly value: number | null;
}
export declare class ChaikinVolatilityProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ChaikinVolatilityCheckpoint> {
    readonly emaLength: number;
    readonly rocLength: number;
    private averageCount;
    private averageSeedSum;
    private averageFormed;
    private averagePrevious;
    private readonly history;
    constructor(emaLength: number, rocLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ChaikinVolatilityCheckpoint;
    protected restoreState(state: ChaikinVolatilityCheckpoint): void;
    private evaluateAverage;
}
export declare const ChaikinVolatilityIndicator: IndicatorDefinition<IndicatorCandle, ChaikinVolatilityParameters>;

// Public API module: calc/chandekrollstop.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../math/index.js';
export interface ChandeKrollStopParameters extends IndicatorParameters {
    readonly period: number;
    readonly multiplier: number;
    readonly stopPeriod: number;
}
export interface ChandeKrollStopCheckpoint {
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
    readonly longAverage: RingBufferCheckpoint<number>;
    readonly shortAverage: RingBufferCheckpoint<number>;
}
export declare class ChandeKrollStopProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ChandeKrollStopCheckpoint> {
    readonly period: number;
    readonly multiplier: number;
    readonly stopPeriod: number;
    private readonly highest;
    private readonly lowest;
    private readonly longAverage;
    private readonly shortAverage;
    constructor(period: number, multiplier: number, stopPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ChandeKrollStopCheckpoint;
    protected restoreState(state: ChandeKrollStopCheckpoint): void;
}
export declare const ChandeKrollStopIndicator: IndicatorDefinition<IndicatorCandle, ChandeKrollStopParameters>;

// Public API module: calc/chandemomentumoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface ChandeMomentumOscillatorCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}
export declare class ChandeMomentumOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ChandeMomentumOscillatorCheckpoint> {
    readonly length: number;
    private initialized;
    private previousClose;
    private readonly up;
    private readonly down;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ChandeMomentumOscillatorCheckpoint;
    protected restoreState(state: ChandeMomentumOscillatorCheckpoint): void;
}
export declare const ChandeMomentumOscillatorIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/choppinessindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export interface ChoppinessIndexCheckpoint {
    readonly highLowRanges: RingBufferCheckpoint<number>;
    readonly trueRanges: RingBufferCheckpoint<number>;
    readonly previousClose: number;
}
export declare class ChoppinessIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ChoppinessIndexCheckpoint> {
    readonly length: number;
    private readonly highLowRanges;
    private readonly trueRanges;
    private readonly logarithm;
    private sumHighLowRange;
    private sumTrueRange;
    private previousClose;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ChoppinessIndexCheckpoint;
    protected restoreState(state: ChoppinessIndexCheckpoint): void;
}
export declare const ChoppinessIndexIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/commoditychannelindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { RecursiveLengthParameters } from './shared/recursive-statistical.js';
export interface CommodityChannelIndexCheckpoint {
    readonly typicalPrices: RingBufferCheckpoint<number | null>;
}
export declare class CommodityChannelIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, CommodityChannelIndexCheckpoint> {
    readonly length: number;
    private readonly index;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): CommodityChannelIndexCheckpoint;
    protected restoreState(state: CommodityChannelIndexCheckpoint): void;
}
export declare const CommodityChannelIndexIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/compositemomentum.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint, type PartialRelativeStrengthIndexCheckpoint, type RingBufferCheckpoint } from '../math/index.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface CompositeMomentumParameters extends IndicatorParameters {
    readonly shortRocLength: number;
    readonly longRocLength: number;
    readonly rsiLength: number;
    readonly emaFastLength: number;
    readonly emaSlowLength: number;
    readonly smaLength: number;
}
export interface CompositeMomentumCheckpoint {
    readonly shortRoc: RingBufferCheckpoint<number | null>;
    readonly longRoc: RingBufferCheckpoint<number | null>;
    readonly rsi: PartialRelativeStrengthIndexCheckpoint;
    readonly fast: FiniteExponentialCheckpoint;
    readonly slow: FiniteExponentialCheckpoint;
    readonly average: RollingWindowCheckpoint;
}
export declare class CompositeMomentumProcessor extends SequentialIndicatorProcessor<IndicatorCandle, CompositeMomentumCheckpoint> {
    readonly shortRocLength: number;
    readonly longRocLength: number;
    readonly rsiLength: number;
    readonly emaFastLength: number;
    readonly emaSlowLength: number;
    readonly smaLength: number;
    private readonly shortRoc;
    private readonly longRoc;
    private readonly rsi;
    private readonly fast;
    private readonly slow;
    private readonly average;
    constructor(shortRocLength: number, longRocLength: number, rsiLength: number, emaFastLength: number, emaSlowLength: number, smaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): CompositeMomentumCheckpoint;
    protected restoreState(state: CompositeMomentumCheckpoint): void;
    private rateOfChange;
}
export declare const CompositeMomentumIndicator: IndicatorDefinition<IndicatorCandle, CompositeMomentumParameters>;

// Public API module: calc/connorsrsi.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type SmoothedMovingAverageCheckpoint } from '../math/index.js';
export interface ConnorsRsiParameters extends IndicatorParameters {
    readonly rsiPeriod: number;
    readonly streakRSIPeriod: number;
    readonly rocRSIPeriod: number;
}
export interface ArrayRsiCheckpoint {
    readonly initialized: boolean;
    readonly previous: number | null;
    readonly previousResult: number | null;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}
export declare class ArrayRsiKernel {
    readonly length: number;
    private initialized;
    private previous;
    private previousResult;
    private readonly gain;
    private readonly loss;
    constructor(length: number);
    push(value: number | null): number | null;
    preview(value: number | null): number | null;
    reset(): void;
    checkpoint(): ArrayRsiCheckpoint;
    restore(state: ArrayRsiCheckpoint): void;
    private evaluate;
}
export interface ConnorsRsiCheckpoint {
    readonly closeRsi: ArrayRsiCheckpoint;
    readonly streakRsi: ArrayRsiCheckpoint;
    readonly rocRsi: ArrayRsiCheckpoint;
    readonly rocHistory: RingBufferCheckpoint<number | null>;
    readonly streakPreviousPrice: number | null;
    readonly streakPrevious: number;
}
export declare class ConnorsRsiProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ConnorsRsiCheckpoint> {
    readonly rsiPeriod: number;
    readonly streakRSIPeriod: number;
    readonly rocRSIPeriod: number;
    private readonly closeRsi;
    private readonly streakRsi;
    private readonly rocRsi;
    private readonly rocHistory;
    private streakPreviousPrice;
    private streakPrevious;
    constructor(rsiPeriod: number, streakRSIPeriod: number, rocRSIPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ConnorsRsiCheckpoint;
    protected restoreState(state: ConnorsRsiCheckpoint): void;
}
export declare const ConnorsRsiIndicator: IndicatorDefinition<IndicatorCandle, ConnorsRsiParameters>;

// Public API module: calc/constancebrowncompositeindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint, type PartialRelativeStrengthIndexCheckpoint, type RingBufferCheckpoint } from '../math/index.js';
export interface ConstanceBrownCompositeIndexParameters extends IndicatorParameters {
    readonly rsiLength: number;
    readonly rocLength: number;
    readonly shortRsiLength: number;
    readonly momentumLength: number;
    readonly fastSmaLength: number;
    readonly slowSmaLength: number;
}
export interface ConstanceBrownCompositeIndexCheckpoint {
    readonly rsi: PartialRelativeStrengthIndexCheckpoint;
    readonly shortRsi: PartialRelativeStrengthIndexCheckpoint;
    readonly rsiHistory: RingBufferCheckpoint<number | null>;
    readonly momentum: RingBufferCheckpoint<number>;
    readonly fastSma: RollingWindowCheckpoint;
    readonly slowSma: RollingWindowCheckpoint;
}
export declare class ConstanceBrownCompositeIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ConstanceBrownCompositeIndexCheckpoint> {
    readonly rsiLength: number;
    readonly rocLength: number;
    readonly shortRsiLength: number;
    readonly momentumLength: number;
    readonly fastSmaLength: number;
    readonly slowSmaLength: number;
    private readonly rsi;
    private readonly shortRsi;
    private readonly rsiHistory;
    private readonly momentum;
    private readonly fastSma;
    private readonly slowSma;
    private readonly combinedBar;
    constructor(rsiLength: number, rocLength: number, shortRsiLength: number, momentumLength: number, fastSmaLength: number, slowSmaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ConstanceBrownCompositeIndexCheckpoint;
    protected restoreState(state: ConstanceBrownCompositeIndexCheckpoint): void;
    private roc;
}
export declare const ConstanceBrownCompositeIndexIndicator: IndicatorDefinition<IndicatorCandle, ConstanceBrownCompositeIndexParameters>;

// Public API module: calc/demandindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface DemandIndexCheckpoint {
    readonly previousClose: number;
    readonly previousVolume: number;
    readonly previousValue: number | null;
    readonly average: RollingWindowCheckpoint;
}
export declare class DemandIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DemandIndexCheckpoint> {
    readonly length: number;
    private previousClose;
    private previousVolume;
    private previousValue;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DemandIndexCheckpoint;
    protected restoreState(state: DemandIndexCheckpoint): void;
    private empty;
}
export declare const DemandIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/demarker.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface DeMarkerCheckpoint {
    readonly previousHigh: number | null;
    readonly previousLow: number | null;
    readonly deMax: RollingWindowCheckpoint;
    readonly deMin: RollingWindowCheckpoint;
}
export declare class DeMarkerProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DeMarkerCheckpoint> {
    readonly length: number;
    private previousHigh;
    private previousLow;
    private readonly deMax;
    private readonly deMin;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DeMarkerCheckpoint;
    protected restoreState(state: DeMarkerCheckpoint): void;
}
export declare const DeMarkerIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/detrendedpriceoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../math/index.js';
import { CycleLengthParameters } from './shared/cycle.js';
export interface DetrendedPriceOscillatorCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly history: RingBufferCheckpoint<number | null>;
}
export declare class DetrendedPriceOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DetrendedPriceOscillatorCheckpoint> {
    readonly length: number;
    private readonly average;
    private readonly history;
    private readonly lookBack;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DetrendedPriceOscillatorCheckpoint;
    protected restoreState(state: DetrendedPriceOscillatorCheckpoint): void;
}
export declare const DetrendedPriceOscillatorIndicator: IndicatorDefinition<IndicatorCandle, CycleLengthParameters>;

// Public API module: calc/detrendedsyntheticprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { CompoundLengthParameters, DonchianChannelsCheckpoint } from './shared/compound.js';
export declare class DetrendedSyntheticPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DonchianChannelsCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DonchianChannelsCheckpoint;
    protected restoreState(state: DonchianChannelsCheckpoint): void;
}
export declare const DetrendedSyntheticPriceIndicator: IndicatorDefinition<IndicatorCandle, CompoundLengthParameters>;

// Public API module: calc/directionalindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { DirectionalMovementCheckpoint, RecursiveLengthParameters } from './shared/recursive-statistical.js';
export declare class DirectionalIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DirectionalMovementCheckpoint> {
    readonly length: number;
    private readonly directional;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DirectionalMovementCheckpoint;
    protected restoreState(state: DirectionalMovementCheckpoint): void;
}
export declare const DirectionalIndexIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/disparityindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class DisparityIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const DisparityIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/donchianchannels.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { CompoundLengthParameters, DonchianChannelsCheckpoint } from './shared/compound.js';
export declare class DonchianChannelsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DonchianChannelsCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DonchianChannelsCheckpoint;
    protected restoreState(state: DonchianChannelsCheckpoint): void;
}
export declare const DonchianChannelsIndicator: IndicatorDefinition<IndicatorCandle, CompoundLengthParameters>;

// Public API module: calc/doubleexponentialmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { CompoundLengthParameters, FiniteExponentialCheckpoint } from './shared/compound.js';
export interface DoubleExponentialMovingAverageCheckpoint {
    readonly first: SeededMovingAverageCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
}
export declare class DoubleExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DoubleExponentialMovingAverageCheckpoint> {
    readonly length: number;
    private readonly first;
    private readonly second;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DoubleExponentialMovingAverageCheckpoint;
    protected restoreState(state: DoubleExponentialMovingAverageCheckpoint): void;
}
export declare const DoubleExponentialMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, CompoundLengthParameters>;

// Public API module: calc/dynamiczonesrsi.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult, type SequentialIndicatorCheckpoint } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { RelativeStrengthIndexCheckpoint } from './shared/momentum-volume.js';
export declare function resolvedFinite(value: unknown, fallback: number, name: string): number;
export interface DynamicZonesRsiParameters extends IndicatorParameters {
    readonly length: number;
    readonly oversoldLevel: number;
    readonly overboughtLevel: number;
}
export interface DynamicZonesRsiCheckpoint {
    readonly rsi: SequentialIndicatorCheckpoint<RelativeStrengthIndexCheckpoint>;
    readonly minimum: RollingWindowCheckpoint;
    readonly maximum: RollingWindowCheckpoint;
}
export declare class DynamicZonesRsiProcessor extends SequentialIndicatorProcessor<IndicatorCandle, DynamicZonesRsiCheckpoint> {
    readonly length: number;
    readonly oversoldLevel: number;
    readonly overboughtLevel: number;
    private readonly rsi;
    private readonly minimum;
    private readonly maximum;
    constructor(length: number, oversoldLevel: number, overboughtLevel: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): DynamicZonesRsiCheckpoint;
    protected restoreState(state: DynamicZonesRsiCheckpoint): void;
}
export declare const DynamicZonesRsiIndicator: IndicatorDefinition<IndicatorCandle, DynamicZonesRsiParameters>;

// Public API module: calc/easeofmovement.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface EaseOfMovementCheckpoint {
    readonly previousHigh: number;
    readonly previousLow: number;
    readonly values: RollingWindowCheckpoint;
}
export declare class EaseOfMovementProcessor extends SequentialIndicatorProcessor<IndicatorCandle, EaseOfMovementCheckpoint> {
    readonly length: number;
    private previousHigh;
    private previousLow;
    private readonly values;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): EaseOfMovementCheckpoint;
    protected restoreState(state: EaseOfMovementCheckpoint): void;
}
export declare const EaseOfMovementIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/ehlersfishertransform.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { CycleLengthParameters } from './shared/cycle.js';
export interface EhlersFisherTransformCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
    readonly previousValue: number;
    readonly previousFisher: number;
}
export declare class EhlersFisherTransformProcessor extends SequentialIndicatorProcessor<IndicatorCandle, EhlersFisherTransformCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    private previousValue;
    private previousFisher;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): EhlersFisherTransformCheckpoint;
    protected restoreState(state: EhlersFisherTransformCheckpoint): void;
}
export declare const EhlersFisherTransformIndicator: IndicatorDefinition<IndicatorCandle, CycleLengthParameters>;

// Public API module: calc/elderforceindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface ElderForceIndexParameters extends IndicatorParameters {
    readonly length: number;
}
export interface ElderForceIndexCheckpoint {
    readonly previousClose: number;
    readonly average: FiniteExponentialCheckpoint;
}
export declare class ElderForceIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ElderForceIndexCheckpoint> {
    readonly length: number;
    private readonly average;
    private previousClose;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ElderForceIndexCheckpoint;
    protected restoreState(state: ElderForceIndexCheckpoint): void;
}
export declare const ElderForceIndexIndicator: IndicatorDefinition<IndicatorCandle, ElderForceIndexParameters>;

// Public API module: calc/elderimpulsesystem.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type PartialSeedExponentialMovingAverageCheckpoint } from '../math/index.js';
export interface ElderImpulseParameters extends IndicatorParameters {
    readonly emaLength: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
}
export interface ElderImpulseCheckpoint {
    readonly ema: PartialSeedExponentialMovingAverageCheckpoint;
    readonly fast: PartialSeedExponentialMovingAverageCheckpoint;
    readonly slow: PartialSeedExponentialMovingAverageCheckpoint;
    readonly previousEma: number | null;
    readonly previousMacd: number | null;
}
export declare class ElderImpulseProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ElderImpulseCheckpoint> {
    readonly emaLength: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
    private readonly ema;
    private readonly fast;
    private readonly slow;
    private readonly formBar;
    private previousEma;
    private previousMacd;
    constructor(emaLength: number, shortMaLength: number, longMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ElderImpulseCheckpoint;
    protected restoreState(state: ElderImpulseCheckpoint): void;
}
export declare const ElderImpulseIndicator: IndicatorDefinition<IndicatorCandle, ElderImpulseParameters>;

// Public API module: calc/elderray.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export declare class ElderRayProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SeededMovingAverageCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SeededMovingAverageCheckpoint;
    protected restoreState(state: SeededMovingAverageCheckpoint): void;
}
export declare const ElderRayIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/elliotwaveoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface ElliotWaveOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface ElliotWaveOscillatorCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
}
export declare class ElliotWaveOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ElliotWaveOscillatorCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly short;
    private readonly long;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ElliotWaveOscillatorCheckpoint;
    protected restoreState(state: ElliotWaveOscillatorCheckpoint): void;
}
export declare const ElliotWaveOscillatorIndicator: IndicatorDefinition<IndicatorCandle, ElliotWaveOscillatorParameters>;

// Public API module: calc/endpointmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class EndpointMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RingBufferCheckpoint<number | null>> {
    readonly length: number;
    private readonly values;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RingBufferCheckpoint<number | null>;
    protected restoreState(state: RingBufferCheckpoint<number | null>): void;
}
export declare const EndpointMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/envelope.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface EnvelopeParameters extends IndicatorParameters {
    readonly length: number;
    readonly shift: number;
}
export declare class EnvelopeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    readonly shift: number;
    private readonly average;
    constructor(length: number, shift: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const EnvelopeIndicator: IndicatorDefinition<IndicatorCandle, EnvelopeParameters>;

// Public API module: calc/exponentialmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class ExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SeededMovingAverageCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SeededMovingAverageCheckpoint;
    protected restoreState(state: SeededMovingAverageCheckpoint): void;
}
export declare const ExponentialMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/fibonacciretracement.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export interface FibonacciRetracementCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare const FIBONACCI_LEVELS: readonly [{
    readonly id: 'l236';
    readonly name: '23.6%';
    readonly ratio: 0.236;
    readonly color: '#ef5350';
}, {
    readonly id: 'l382';
    readonly name: '38.2%';
    readonly ratio: 0.382;
    readonly color: '#ffb74d';
}, {
    readonly id: 'l500';
    readonly name: '50.0%';
    readonly ratio: 0.5;
    readonly color: '#ffee58';
}, {
    readonly id: 'l618';
    readonly name: '61.8%';
    readonly ratio: 0.618;
    readonly color: '#66bb6a';
}, {
    readonly id: 'l786';
    readonly name: '78.6%';
    readonly ratio: 0.786;
    readonly color: '#42a5f5';
}];
export declare class FibonacciRetracementProcessor extends SequentialIndicatorProcessor<IndicatorCandle, FibonacciRetracementCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): FibonacciRetracementCheckpoint;
    protected restoreState(state: FibonacciRetracementCheckpoint): void;
}
export declare const FibonacciRetracementIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/finitevolumeelement.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class FiniteVolumeElementProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const FiniteVolumeElementIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/forceindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface ForceIndexCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly average: SeededMovingAverageCheckpoint;
}
export declare class ForceIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ForceIndexCheckpoint> {
    readonly length: number;
    private initialized;
    private previousClose;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ForceIndexCheckpoint;
    protected restoreState(state: ForceIndexCheckpoint): void;
}
export declare const ForceIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/forecastoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class ForecastOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const ForecastOscillatorIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/fractaladaptivemovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { AdaptiveLengthParameters } from './shared/adaptive.js';
export interface FractalAdaptiveCheckpoint {
    readonly previous: number;
    readonly closes: RingBufferCheckpoint<number>;
}
export interface FractalRange {
    readonly minimum: number;
    readonly maximum: number;
}
export declare class FractalAdaptiveMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, FractalAdaptiveCheckpoint> {
    readonly length: number;
    private readonly period;
    private readonly remaining;
    private readonly closes;
    private readonly periodMinimum;
    private readonly periodMaximum;
    private readonly remainingMinimum;
    private readonly remainingMaximum;
    private readonly periodRanges;
    private previous;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): FractalAdaptiveCheckpoint;
    protected restoreState(state: FractalAdaptiveCheckpoint): void;
    private delayedRange;
    private restoreClose;
}
export declare const FractalAdaptiveMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, AdaptiveLengthParameters>;

// Public API module: calc/fractaldimension.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { RecursiveLengthParameters } from './shared/recursive-statistical.js';
export interface FractalDimensionCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
}
export declare class FractalDimensionProcessor extends SequentialIndicatorProcessor<IndicatorCandle, FractalDimensionCheckpoint> {
    readonly length: number;
    private readonly values;
    private readonly maximum;
    private readonly minimum;
    private readonly logDenominator;
    private pathLength;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): FractalDimensionCheckpoint;
    protected restoreState(state: FractalDimensionCheckpoint): void;
    private projectPath;
    private append;
}
export declare const FractalDimensionIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/fractals.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
export interface FractalsParameters extends IndicatorParameters {
    readonly length: number;
}
export interface FractalWindowValue {
    readonly high: number | null;
    readonly low: number | null;
}
export interface FractalsCheckpoint {
    readonly window: RingBufferCheckpoint<FractalWindowValue>;
    readonly upCounter: number;
    readonly downCounter: number;
}
export declare class FractalsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, FractalsCheckpoint> {
    readonly length: number;
    private readonly window;
    private upCounter;
    private downCounter;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): FractalsCheckpoint;
    protected restoreState(state: FractalsCheckpoint): void;
    private pivot;
}
export declare const FractalsIndicator: IndicatorDefinition<IndicatorCandle, FractalsParameters>;

// Public API module: calc/gatoroscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type SmoothedMovingAverageCheckpoint } from '../math/index.js';
import { AlligatorParameters } from './shared/shifted-sparse.js';
export interface GatorLineCheckpoint {
    readonly average: SmoothedMovingAverageCheckpoint;
    readonly delay: RingBufferCheckpoint<number | null>;
}
export interface GatorOscillatorCheckpoint {
    readonly jaw: GatorLineCheckpoint;
    readonly teeth: GatorLineCheckpoint;
    readonly lips: GatorLineCheckpoint;
}
export declare class GatorOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, GatorOscillatorCheckpoint> {
    readonly jawLength: number;
    readonly jawShift: number;
    readonly teethLength: number;
    readonly teethShift: number;
    readonly lipsLength: number;
    readonly lipsShift: number;
    private readonly jaw;
    private readonly teeth;
    private readonly lips;
    private readonly jawDelay;
    private readonly teethDelay;
    private readonly lipsDelay;
    constructor(jawLength: number, jawShift: number, teethLength: number, teethShift: number, lipsLength: number, lipsShift: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): GatorOscillatorCheckpoint;
    protected restoreState(state: GatorOscillatorCheckpoint): void;
    private line;
    private lineCheckpoint;
    private restoreLine;
}
export declare const GatorOscillatorIndicator: IndicatorDefinition<IndicatorCandle, AlligatorParameters>;

// Public API module: calc/gopalakrishnanrangeindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface VolatilityLengthParameters extends IndicatorParameters {
    readonly length: number;
}
export interface GopalakrishnanRangeIndexCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare class GopalakrishnanRangeIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, GopalakrishnanRangeIndexCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    private readonly logLength;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): GopalakrishnanRangeIndexCheckpoint;
    protected restoreState(state: GopalakrishnanRangeIndexCheckpoint): void;
}
export declare const GopalakrishnanRangeIndexIndicator: IndicatorDefinition<IndicatorCandle, VolatilityLengthParameters>;

// Public API module: calc/guppymultiplemovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
export interface GuppyMultipleMovingAverageCheckpoint {
    readonly short: readonly SeededMovingAverageCheckpoint[];
    readonly long: readonly SeededMovingAverageCheckpoint[];
}
export declare const GMMA_SHORT_LENGTHS: readonly [3, 5, 8, 10, 12, 15];
export declare const GMMA_LONG_LENGTHS: readonly [30, 35, 40, 45, 50, 60];
export declare const GMMA_OUTPUTS: readonly string[];
export declare class GuppyMultipleMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, GuppyMultipleMovingAverageCheckpoint> {
    private readonly short;
    private readonly long;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): GuppyMultipleMovingAverageCheckpoint;
    protected restoreState(state: GuppyMultipleMovingAverageCheckpoint): void;
}
export declare const GuppyMultipleMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/harmonicoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { CycleLengthParameters } from './shared/cycle.js';
export interface HarmonicOscillatorCheckpoint {
    readonly values: RingBufferCheckpoint<number | null>;
}
export interface HarmonicEvaluation {
    readonly size: number;
    readonly sine: number;
    readonly cosine: number;
    readonly invalid: number;
}
export declare class HarmonicOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, HarmonicOscillatorCheckpoint> {
    readonly length: number;
    private readonly values;
    private readonly sineStep;
    private readonly cosineStep;
    private sine;
    private cosine;
    private invalid;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): HarmonicOscillatorCheckpoint;
    protected restoreState(state: HarmonicOscillatorCheckpoint): void;
    private evaluate;
    private append;
}
export declare const HarmonicOscillatorIndicator: IndicatorDefinition<IndicatorCandle, CycleLengthParameters>;

// Public API module: calc/highest.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare const HighestIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/highlowindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface HighLowIndexCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare class HighLowIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, HighLowIndexCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): HighLowIndexCheckpoint;
    protected restoreState(state: HighLowIndexCheckpoint): void;
}
export declare const HighLowIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/historicalvolatilityratio.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface HistoricalVolatilityRatioParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface HistoricalVolatilityRatioCheckpoint {
    readonly short: RollingWindowCheckpoint;
    readonly long: RollingWindowCheckpoint;
}
export declare class HistoricalVolatilityRatioProcessor extends SequentialIndicatorProcessor<IndicatorCandle, HistoricalVolatilityRatioCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly short;
    private readonly long;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): HistoricalVolatilityRatioCheckpoint;
    protected restoreState(state: HistoricalVolatilityRatioCheckpoint): void;
}
export declare const HistoricalVolatilityRatioIndicator: IndicatorDefinition<IndicatorCandle, HistoricalVolatilityRatioParameters>;

// Public API module: calc/hullmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface HullMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly sqrtPeriod: number;
}
export interface HullMovingAverageCheckpoint {
    readonly slow: RollingWindowCheckpoint;
    readonly fast: RollingWindowCheckpoint;
    readonly result: RollingWindowCheckpoint;
}
export declare class HullMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, HullMovingAverageCheckpoint> {
    readonly length: number;
    readonly sqrtPeriod: number;
    readonly halfLength: number;
    readonly resultLength: number;
    private readonly slow;
    private readonly fast;
    private readonly result;
    constructor(length: number, sqrtPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): HullMovingAverageCheckpoint;
    protected restoreState(state: HullMovingAverageCheckpoint): void;
}
export declare const HullMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, HullMovingAverageParameters>;

// Public API module: calc/hurstexponent.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { RecursiveLengthParameters } from './shared/recursive-statistical.js';
export interface HurstExponentCheckpoint {
    readonly values: RingBufferCheckpoint<number | null>;
}
export interface HurstWindowEvaluation {
    readonly size: number;
    readonly sum: number;
    readonly invalid: number;
}
export declare class HurstExponentProcessor extends SequentialIndicatorProcessor<IndicatorCandle, HurstExponentCheckpoint> {
    readonly length: number;
    private readonly values;
    private readonly logLength;
    private sum;
    private invalid;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): HurstExponentCheckpoint;
    protected restoreState(state: HurstExponentCheckpoint): void;
    private evaluate;
    private projectedValue;
    private append;
}
export declare const HurstExponentIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/ichimoku.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export declare function parameter(values: IchimokuParameters, name: 'tenkanLength' | 'kijunLength' | 'senkouBLength', alias: 'tenkanPeriod' | 'kijunPeriod' | 'senkouBPeriod', fallback: number, maximum: number): number;
export declare function lengthParameter(id: 'tenkanLength' | 'kijunLength' | 'senkouBLength' | 'chinkouLength', name: string, defaultValue: number, maximum: number): {
    readonly id: "chinkouLength" | "kijunLength" | "senkouBLength" | "tenkanLength";
    readonly name: string;
    readonly type: "integer";
    readonly defaultValue: number;
    readonly min: 1 | 2;
    readonly max: number;
    readonly step: 1;
};
export interface IchimokuParameters extends IndicatorParameters {
    readonly tenkanLength: number;
    readonly kijunLength: number;
    readonly senkouBLength: number;
    readonly chinkouLength: number;
}
export interface IchimokuCheckpoint {
    readonly tenkanHigh: RollingWindowCheckpoint;
    readonly tenkanLow: RollingWindowCheckpoint;
    readonly kijunHigh: RollingWindowCheckpoint;
    readonly kijunLow: RollingWindowCheckpoint;
    readonly senkouBHigh: RollingWindowCheckpoint;
    readonly senkouBLow: RollingWindowCheckpoint;
}
export declare class IchimokuProcessor extends SequentialIndicatorProcessor<IndicatorCandle, IchimokuCheckpoint> {
    readonly tenkanLength: number;
    readonly kijunLength: number;
    readonly senkouBLength: number;
    readonly chinkouLength: number;
    private readonly tenkanHigh;
    private readonly tenkanLow;
    private readonly kijunHigh;
    private readonly kijunLow;
    private readonly senkouBHigh;
    private readonly senkouBLow;
    constructor(tenkanLength: number, kijunLength: number, senkouBLength: number, chinkouLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): IchimokuCheckpoint;
    protected restoreState(state: IchimokuCheckpoint): void;
    private forward;
}
export declare const IchimokuIndicator: IndicatorDefinition<IndicatorCandle, IchimokuParameters>;

// Public API module: calc/index.d.ts
export type { AdaptiveLengthParameters, } from './shared/adaptive.js';
export type { BollingerBandsCheckpoint, CompoundLengthParameters, DonchianChannelsCheckpoint, FiniteExponentialCheckpoint, MacdCheckpoint, MacdEvaluation, } from './shared/compound.js';
export { FiniteExponentialAverage, MacdKernel, } from './shared/compound.js';
export type { LengthIndicatorParameters, } from './shared/core.js';
export { HighestProcessor, SmoothedMovingAverageProcessor, } from './shared/core.js';
export type { CycleLengthParameters, } from './shared/cycle.js';
export type { MomentumLengthParameters, OnBalanceVolumeCheckpoint, PriceBufferCheckpoint, RelativeStrengthIndexCheckpoint, } from './shared/momentum-volume.js';
export { BufferedPriceProcessor, OnBalanceVolumeKernel, RelativeStrengthIndexProcessor, } from './shared/momentum-volume.js';
export type { AroonCheckpoint, AroonValue, RangeLengthParameters, } from './shared/range.js';
export type { DirectionalCandleSnapshot, DirectionalMovementCheckpoint, DirectionalMovementResult, RecursiveLengthParameters, } from './shared/recursive-statistical.js';
export { DirectionalMovementKernel, } from './shared/recursive-statistical.js';
export type { AlligatorParameters, ZigZagCheckpoint, ZigZagDirection, ZigZagParameters, ZigZagSource, } from './shared/shifted-sparse.js';
export { ZigZagFamilyProcessor, } from './shared/shifted-sparse.js';
export * from './acceleration.js';
export * from './accumulationdistributionline.js';
export * from './adaptivelaguerrefilter.js';
export * from './adaptivepricezone.js';
export * from './alligator.js';
export * from './approvalflowindex.js';
export * from './arnaudlegouxmovingaverage.js';
export * from './aroon.js';
export * from './aroonoscillator.js';
export * from './averagedirectionalindex.js';
export * from './averagetruerange.js';
export * from './awesomeoscillator.js';
export * from './balanceofmarketpower.js';
export * from './balanceofpower.js';
export * from './balancevolume.js';
export * from './bearpower.js';
export * from './bollingerbands.js';
export * from './bollingerpercentb.js';
export * from './bullpower.js';
export * from './centerofgravityoscillator.js';
export * from './chaikinmoneyflow.js';
export * from './chaikinvolatility.js';
export * from './chandekrollstop.js';
export * from './chandemomentumoscillator.js';
export * from './choppinessindex.js';
export * from './commoditychannelindex.js';
export * from './compositemomentum.js';
export * from './connorsrsi.js';
export * from './constancebrowncompositeindex.js';
export * from './demarker.js';
export * from './demandindex.js';
export * from './detrendedpriceoscillator.js';
export * from './detrendedsyntheticprice.js';
export * from './directionalindex.js';
export * from './disparityindex.js';
export * from './donchianchannels.js';
export * from './doubleexponentialmovingaverage.js';
export * from './dynamiczonesrsi.js';
export * from './easeofmovement.js';
export * from './ehlersfishertransform.js';
export * from './elderforceindex.js';
export * from './elderimpulsesystem.js';
export * from './elderray.js';
export * from './elliotwaveoscillator.js';
export * from './endpointmovingaverage.js';
export * from './envelope.js';
export * from './exponentialmovingaverage.js';
export * from './fibonacciretracement.js';
export * from './finitevolumeelement.js';
export * from './forceindex.js';
export * from './forecastoscillator.js';
export * from './fractaladaptivemovingaverage.js';
export * from './fractaldimension.js';
export * from './fractals.js';
export * from './gatoroscillator.js';
export * from './gopalakrishnanrangeindex.js';
export * from './guppymultiplemovingaverage.js';
export * from './harmonicoscillator.js';
export * from './highlowindex.js';
export * from './highest.js';
export * from './historicalvolatilityratio.js';
export * from './hullmovingaverage.js';
export * from './hurstexponent.js';
export * from './ichimoku.js';
export * from './intradayintensityindex.js';
export * from './intradaymomentumindex.js';
export * from './jurikmovingaverage.js';
export * from './kalmanfilter.js';
export * from './kasepeakoscillator.js';
export * from './kaufmanadaptivemovingaverage.js';
export * from './kaufmanefficiencyratio.js';
export * from './keltnerchannels.js';
export * from './klingervolumeoscillator.js';
export * from './knowsurething.js';
export * from './laguerrersi.js';
export * from './linearreg.js';
export * from './linearregressionforecast.js';
export * from './linearregrsquared.js';
export * from './linearregslope.js';
export * from './lowest.js';
export * from './lunarphase.js';
export * from './movingaverageconvergencedivergence.js';
export * from './movingaverageconvergencedivergencehistogram.js';
export * from './movingaverageconvergencedivergencesignal.js';
export * from './marketfacilitationindex.js';
export * from './marketmeannessindex.js';
export * from './massindex.js';
export * from './mcclellanoscillator.js';
export * from './mcginleydynamic.js';
export * from './meandeviation.js';
export * from './median.js';
export * from './medianprice.js';
export * from './momentum.js';
export * from './momentumofmovingaverage.js';
export * from './momentumpinball.js';
export * from './moneyflowindex.js';
export * from './movingaveragecrossover.js';
export * from './movingaverageribbon.js';
export * from './negativevolumeindex.js';
export * from './nickrypocktrailingreverse.js';
export * from './onbalancevolume.js';
export * from './onbalancevolumemean.js';
export * from './optimaltracking.js';
export * from './oscillatorofmovingaverage.js';
export * from './parabolicsar.js';
export * from './passthroughindicator.js';
export * from './peak.js';
export * from './percentagepriceoscillator.js';
export * from './percentagepriceoscillatorhistogram.js';
export * from './percentagepriceoscillatorsignal.js';
export * from './percentagevolumeoscillator.js';
export * from './pivotpoints.js';
export * from './positivevolumeindex.js';
export * from './prettygoodoscillator.js';
export * from './pricechannels.js';
export * from './pricevolumetrend.js';
export * from './psychologicalline.js';
export * from './qstick.js';
export * from './rainbowcharts.js';
export * from './rangeactionverificationindex.js';
export * from './rankcorrelationindex.js';
export * from './rateofchange.js';
export * from './relativemomentumindex.js';
export * from './relativestrengthindex.js';
export * from './relativevigorindex.js';
export * from './schafftrendcycle.js';
export * from './shift.js';
export * from './simplemovingaverage.js';
export * from './sinewave.js';
export * from './smoothedmovingaverage.js';
export * from './standarddeviation.js';
export * from './standarderror.js';
export * from './stochasticoscillator.js';
export * from './stochastick.js';
export * from './sum.js';
export * from './supertrend.js';
export * from './t3movingaverage.js';
export * from './timeweightedaverageprice.js';
export * from './tripleexponentialmovingaverage.js';
export * from './trix.js';
export * from './trough.js';
export * from './truerange.js';
export * from './truestrengthindex.js';
export * from './twiggsmoneyflow.js';
export * from './typicalprice.js';
export * from './ultimateoscillator.js';
export * from './variablemovingaverage.js';
export * from './verticalhorizontalfilter.js';
export * from './vidya.js';
export * from './volumeindicator.js';
export * from './volumeweightedaverageprice.js';
export * from './volumeweightedmovingaverage.js';
export * from './vortexindicator.js';
export * from './wavetrendoscillator.js';
export * from './weightedcloseprice.js';
export * from './weightedmovingaverage.js';
export * from './wildermovingaverage.js';
export * from './williamsaccumulationdistribution.js';
export * from './williamsr.js';
export * from './williamsvariableaccumulationdistribution.js';
export * from './woodiescci.js';
export * from './zerolagexponentialmovingaverage.js';
export * from './zigzag.js';

// Public API module: calc/intradayintensityindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class IntradayIntensityIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const IntradayIntensityIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/intradaymomentumindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface IntradayMomentumIndexCheckpoint {
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}
export declare class IntradayMomentumIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, IntradayMomentumIndexCheckpoint> {
    readonly length: number;
    private readonly up;
    private readonly down;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): IntradayMomentumIndexCheckpoint;
    protected restoreState(state: IntradayMomentumIndexCheckpoint): void;
}
export declare const IntradayMomentumIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/jurikmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface JurikMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly phase: number;
}
export interface JurikMovingAverageCheckpoint {
    readonly formed: boolean;
    readonly previousMa1: number;
    readonly previousMa2: number;
}
export declare class JurikMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, JurikMovingAverageCheckpoint> {
    readonly length: number;
    readonly phase: number;
    private formed;
    private previousMa1;
    private previousMa2;
    private readonly beta;
    private readonly phaseRatio;
    constructor(length: number, phase: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): JurikMovingAverageCheckpoint;
    protected restoreState(state: JurikMovingAverageCheckpoint): void;
}
export declare const JurikMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, JurikMovingAverageParameters>;

// Public API module: calc/kalmanfilter.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface KalmanFilterParameters extends IndicatorParameters {
    readonly length: number;
    readonly processNoise: number;
    readonly measurementNoise: number;
}
export interface KalmanFilterCheckpoint {
    readonly lastEstimate: number | null;
    readonly errorCovariance: number;
    readonly count: number;
}
export declare function resolvedPositive(value: unknown, fallback: number, name: string): number;
export declare class KalmanFilterProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KalmanFilterCheckpoint> {
    readonly length: number;
    readonly processNoise: number;
    readonly measurementNoise: number;
    private lastEstimate;
    private errorCovariance;
    private count;
    constructor(length: number, processNoise: number, measurementNoise: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KalmanFilterCheckpoint;
    protected restoreState(state: KalmanFilterCheckpoint): void;
}
export declare const KalmanFilterIndicator: IndicatorDefinition<IndicatorCandle, KalmanFilterParameters>;

// Public API module: calc/kasepeakoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type ExpandingAverageTrueRangeCheckpoint, type RingBufferCheckpoint } from '../math/index.js';
export interface KasePeakOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface KasePeakOscillatorCheckpoint {
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
    readonly peaks: RingBufferCheckpoint<number>;
    readonly valleys: RingBufferCheckpoint<number>;
    readonly previousClose: number;
}
export declare class KasePeakOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KasePeakOscillatorCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly averageTrueRange;
    private readonly peaks;
    private readonly valleys;
    private previousClose;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KasePeakOscillatorCheckpoint;
    protected restoreState(state: KasePeakOscillatorCheckpoint): void;
    private nextBuffer;
}
export declare const KasePeakOscillatorIndicator: IndicatorDefinition<IndicatorCandle, KasePeakOscillatorParameters>;

// Public API module: calc/kaufmanadaptivemovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingEfficiencyRatioCheckpoint } from '../math/index.js';
export interface KaufmanAdaptiveParameters extends IndicatorParameters {
    readonly length: number;
    readonly fastSCPeriod: number;
    readonly slowSCPeriod: number;
}
export interface KaufmanAdaptiveCheckpoint {
    readonly disabled: boolean;
    readonly seeded: boolean;
    readonly previous: number;
    readonly ratio: RollingEfficiencyRatioCheckpoint;
}
export declare class KaufmanAdaptiveMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KaufmanAdaptiveCheckpoint> {
    readonly length: number;
    readonly fastSCPeriod: number;
    readonly slowSCPeriod: number;
    private readonly ratio;
    private readonly fastConstant;
    private readonly slowConstant;
    private disabled;
    private seeded;
    private previous;
    constructor(length: number, fastSCPeriod: number, slowSCPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KaufmanAdaptiveCheckpoint;
    protected restoreState(state: KaufmanAdaptiveCheckpoint): void;
}
export declare const KaufmanAdaptiveMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, KaufmanAdaptiveParameters>;

// Public API module: calc/kaufmanefficiencyratio.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingEfficiencyRatioCheckpoint } from '../math/index.js';
import { AdaptiveLengthParameters } from './shared/adaptive.js';
export declare class KaufmanEfficiencyRatioProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingEfficiencyRatioCheckpoint> {
    readonly length: number;
    private readonly ratio;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingEfficiencyRatioCheckpoint;
    protected restoreState(state: RollingEfficiencyRatioCheckpoint): void;
}
export declare const KaufmanEfficiencyRatioIndicator: IndicatorDefinition<IndicatorCandle, AdaptiveLengthParameters>;

// Public API module: calc/keltnerchannels.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type ExpandingAverageTrueRangeCheckpoint, type PartialSeedExponentialMovingAverageCheckpoint } from '../math/index.js';
export interface KeltnerChannelsParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiplier: number;
}
export interface KeltnerChannelsCheckpoint {
    readonly middle: PartialSeedExponentialMovingAverageCheckpoint;
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
}
export declare class KeltnerChannelsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KeltnerChannelsCheckpoint> {
    readonly length: number;
    readonly multiplier: number;
    private readonly middle;
    private readonly averageTrueRange;
    constructor(length: number, multiplier: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KeltnerChannelsCheckpoint;
    protected restoreState(state: KeltnerChannelsCheckpoint): void;
}
export declare const KeltnerChannelsIndicator: IndicatorDefinition<IndicatorCandle, KeltnerChannelsParameters>;

// Public API module: calc/klingervolumeoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface KlingerVolumeOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface KlingerVolumeOscillatorCheckpoint {
    readonly previousHlc: number;
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}
export declare class KlingerVolumeOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KlingerVolumeOscillatorCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private previousHlc;
    private readonly short;
    private readonly long;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KlingerVolumeOscillatorCheckpoint;
    protected restoreState(state: KlingerVolumeOscillatorCheckpoint): void;
}
export declare const KlingerVolumeOscillatorIndicator: IndicatorDefinition<IndicatorCandle, KlingerVolumeOscillatorParameters>;

// Public API module: calc/knowsurething.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint, type RingBufferCheckpoint } from '../math/index.js';
export interface KnowSureThingParameters extends IndicatorParameters {
    readonly roc1Length: number;
    readonly roc2Length: number;
    readonly roc3Length: number;
    readonly roc4Length: number;
    readonly sma1Length: number;
    readonly sma2Length: number;
    readonly sma3Length: number;
    readonly sma4Length: number;
    readonly signalLength: number;
}
export interface KnowSureThingCheckpoint {
    readonly closes: RingBufferCheckpoint<number | null>;
    readonly averages: readonly RollingWindowCheckpoint[];
    readonly signal: RollingWindowCheckpoint;
}
export declare class KnowSureThingProcessor extends SequentialIndicatorProcessor<IndicatorCandle, KnowSureThingCheckpoint> {
    readonly roc1Length: number;
    readonly roc2Length: number;
    readonly roc3Length: number;
    readonly roc4Length: number;
    readonly sma1Length: number;
    readonly sma2Length: number;
    readonly sma3Length: number;
    readonly sma4Length: number;
    readonly signalLength: number;
    private readonly rocLengths;
    private readonly closes;
    private readonly averages;
    private readonly signal;
    constructor(roc1Length: number, roc2Length: number, roc3Length: number, roc4Length: number, sma1Length: number, sma2Length: number, sma3Length: number, sma4Length: number, signalLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): KnowSureThingCheckpoint;
    protected restoreState(state: KnowSureThingCheckpoint): void;
}
export declare const KnowSureThingIndicator: IndicatorDefinition<IndicatorCandle, KnowSureThingParameters>;

// Public API module: calc/laguerrersi.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface LaguerreRsiParameters extends IndicatorParameters {
    readonly gamma: number;
}
export interface LaguerreRsiCheckpoint {
    readonly l0: number;
    readonly l1: number;
    readonly l2: number;
    readonly l3: number;
    readonly previousUp: number;
    readonly previousDown: number;
    readonly formed: boolean;
}
export declare class LaguerreRsiProcessor extends SequentialIndicatorProcessor<IndicatorCandle, LaguerreRsiCheckpoint> {
    readonly gamma: number;
    private l0;
    private l1;
    private l2;
    private l3;
    private previousUp;
    private previousDown;
    private formed;
    constructor(gamma: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): LaguerreRsiCheckpoint;
    protected restoreState(state: LaguerreRsiCheckpoint): void;
}
export declare const LaguerreRsiIndicator: IndicatorDefinition<IndicatorCandle, LaguerreRsiParameters>;

// Public API module: calc/linearreg.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class LinearRegressionProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const LinearRegressionIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/linearregressionforecast.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class LinearRegressionForecastProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const LinearRegressionForecastIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/linearregrsquared.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class LinearRegressionRSquaredProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const LinearRegressionRSquaredIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/linearregslope.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class LinearRegressionSlopeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const LinearRegressionSlopeIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/lowest.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class LowestProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly minimum;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const LowestIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/lunarphase.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class LunarPhaseProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const LunarPhaseIndicator: IndicatorDefinition<IndicatorCandle>;

// Public API module: calc/marketfacilitationindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class MarketFacilitationIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const MarketFacilitationIndexIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/marketmeannessindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { RecursiveLengthParameters } from './shared/recursive-statistical.js';
export interface MarketMeannessIndexCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
    readonly priceChanges: number;
    readonly directionChanges: number;
}
export interface MarketMeannessEvaluation {
    readonly priceChanges: number;
    readonly directionChanges: number;
    readonly size: number;
    readonly value: number | null;
}
export declare class MarketMeannessIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MarketMeannessIndexCheckpoint> {
    readonly length: number;
    private readonly values;
    private priceChanges;
    private directionChanges;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MarketMeannessIndexCheckpoint;
    protected restoreState(state: MarketMeannessIndexCheckpoint): void;
    private evaluate;
    private direction;
    private isDirectionChange;
}
export declare const MarketMeannessIndexIndicator: IndicatorDefinition<IndicatorCandle, RecursiveLengthParameters>;

// Public API module: calc/massindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type PartialSeedExponentialMovingAverageCheckpoint } from '../math/index.js';
export interface MassIndexParameters extends IndicatorParameters {
    readonly length: number;
    readonly emaLength: number;
}
export interface MassIndexCheckpoint {
    readonly single: PartialSeedExponentialMovingAverageCheckpoint;
    readonly double: PartialSeedExponentialMovingAverageCheckpoint;
    readonly ratios: RingBufferCheckpoint<number>;
    readonly ratioSum: number;
}
export declare class MassIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MassIndexCheckpoint> {
    readonly length: number;
    readonly emaLength: number;
    private readonly single;
    private readonly double;
    private readonly ratios;
    private ratioSum;
    constructor(length: number, emaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MassIndexCheckpoint;
    protected restoreState(state: MassIndexCheckpoint): void;
}
export declare const MassIndexIndicator: IndicatorDefinition<IndicatorCandle, MassIndexParameters>;

// Public API module: calc/mcclellanoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
export interface McClellanOscillatorParameters extends IndicatorParameters {
    readonly ema19Length: number;
    readonly ema39Length: number;
}
export interface McClellanOscillatorCheckpoint {
    readonly short: SeededMovingAverageCheckpoint;
    readonly long: SeededMovingAverageCheckpoint;
}
export declare class McClellanOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, McClellanOscillatorCheckpoint> {
    readonly ema19Length: number;
    readonly ema39Length: number;
    private readonly short;
    private readonly long;
    constructor(ema19Length: number, ema39Length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): McClellanOscillatorCheckpoint;
    protected restoreState(state: McClellanOscillatorCheckpoint): void;
}
export declare const McClellanOscillatorIndicator: IndicatorDefinition<IndicatorCandle, McClellanOscillatorParameters>;

// Public API module: calc/mcginleydynamic.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { AdaptiveLengthParameters } from './shared/adaptive.js';
export interface McGinleyDynamicCheckpoint {
    readonly count: number;
    readonly seedSum: number;
    readonly seedValid: boolean;
    readonly previous: number | null;
}
export declare class McGinleyDynamicProcessor extends SequentialIndicatorProcessor<IndicatorCandle, McGinleyDynamicCheckpoint> {
    readonly length: number;
    private count;
    private seedSum;
    private seedValid;
    private previous;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): McGinleyDynamicCheckpoint;
    protected restoreState(state: McGinleyDynamicCheckpoint): void;
}
export declare const McGinleyDynamicIndicator: IndicatorDefinition<IndicatorCandle, AdaptiveLengthParameters>;

// Public API module: calc/meandeviation.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class MeanDeviationProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly deviation;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const MeanDeviationIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/median.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class MedianProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly median;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const MedianIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/medianprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class MedianPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const MedianPriceIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/momentum.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { type IndicatorCalculationResult } from '../sequential-processor.js';
import { BufferedPriceProcessor, MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class MomentumProcessor extends BufferedPriceProcessor {
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
}
export declare const MomentumIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/momentumofmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
export interface MomentumOfMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly momentumPeriod: number;
}
export interface MomentumOfMovingAverageCheckpoint {
    readonly values: RingBufferCheckpoint<number>;
    readonly sum: number;
}
export declare class MomentumOfMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MomentumOfMovingAverageCheckpoint> {
    readonly length: number;
    readonly momentumPeriod: number;
    private readonly values;
    private sum;
    constructor(length: number, momentumPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MomentumOfMovingAverageCheckpoint;
    protected restoreState(state: MomentumOfMovingAverageCheckpoint): void;
    private push;
}
export declare const MomentumOfMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, MomentumOfMovingAverageParameters>;

// Public API module: calc/momentumpinball.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class MomentumPinballProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RingBufferCheckpoint<number>> {
    readonly length: number;
    private readonly values;
    private readonly minimum;
    private readonly maximum;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RingBufferCheckpoint<number>;
    protected restoreState(state: RingBufferCheckpoint<number>): void;
}
export declare const MomentumPinballIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/moneyflowindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface MoneyFlowIndexCheckpoint {
    readonly previousTypical: number;
    readonly positive: RollingWindowCheckpoint;
    readonly negative: RollingWindowCheckpoint;
}
export declare class MoneyFlowIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MoneyFlowIndexCheckpoint> {
    readonly length: number;
    private previousTypical;
    private readonly positive;
    private readonly negative;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MoneyFlowIndexCheckpoint;
    protected restoreState(state: MoneyFlowIndexCheckpoint): void;
}
export declare const MoneyFlowIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/movingaverageconvergencedivergence.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface MovingAverageConvergenceDivergenceParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
}
export interface MovingAverageConvergenceDivergenceCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}
export declare class MovingAverageConvergenceDivergenceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MovingAverageConvergenceDivergenceCheckpoint> {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    private readonly short;
    private readonly long;
    constructor(shortMaLength: number, longMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MovingAverageConvergenceDivergenceCheckpoint;
    protected restoreState(state: MovingAverageConvergenceDivergenceCheckpoint): void;
}
export declare const MovingAverageConvergenceDivergenceIndicator: IndicatorDefinition<IndicatorCandle, MovingAverageConvergenceDivergenceParameters>;

// Public API module: calc/movingaverageconvergencedivergencehistogram.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { MacdCheckpoint } from './shared/compound.js';
export interface MacdHistogramParameters extends IndicatorParameters {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly signalMaLength: number;
}
export declare class MacdHistogramProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MacdCheckpoint> {
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly signalMaLength: number;
    private readonly kernel;
    constructor(shortMaLength: number, longMaLength: number, signalMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MacdCheckpoint;
    protected restoreState(state: MacdCheckpoint): void;
}
export declare const MacdHistogramIndicator: IndicatorDefinition<IndicatorCandle, MacdHistogramParameters>;

// Public API module: calc/movingaverageconvergencedivergencesignal.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { MacdCheckpoint } from './shared/compound.js';
export interface MacdSignalParameters extends IndicatorParameters {
    readonly longMaLength: number;
    readonly shortMaLength: number;
    readonly signalMaLength: number;
}
export declare class MacdSignalProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MacdCheckpoint> {
    readonly longMaLength: number;
    readonly shortMaLength: number;
    readonly signalMaLength: number;
    private readonly kernel;
    constructor(longMaLength: number, shortMaLength: number, signalMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MacdCheckpoint;
    protected restoreState(state: MacdCheckpoint): void;
}
export declare const MacdSignalIndicator: IndicatorDefinition<IndicatorCandle, MacdSignalParameters>;

// Public API module: calc/movingaveragecrossover.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface MovingAverageCrossoverParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface MovingAverageCrossoverCheckpoint {
    readonly fast: RollingWindowCheckpoint;
    readonly slow: RollingWindowCheckpoint;
}
export declare class MovingAverageCrossoverProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MovingAverageCrossoverCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly fast;
    private readonly slow;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MovingAverageCrossoverCheckpoint;
    protected restoreState(state: MovingAverageCrossoverCheckpoint): void;
}
export declare const MovingAverageCrossoverIndicator: IndicatorDefinition<IndicatorCandle, MovingAverageCrossoverParameters>;

// Public API module: calc/movingaverageribbon.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorOutputDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface MovingAverageRibbonParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly ribbonCount: number;
}
export interface MovingAverageRibbonCheckpoint {
    readonly averages: readonly RollingWindowCheckpoint[];
}
export declare function movingAverageRibbonLengths(shortPeriod: number, longPeriod: number, ribbonCount: number): readonly number[];
export declare function movingAverageRibbonOutputs(parameters: MovingAverageRibbonParameters): readonly IndicatorOutputDefinition[];
export declare const DEFAULT_MOVING_AVERAGE_RIBBON_OUTPUTS: readonly IndicatorOutputDefinition[];
export declare class MovingAverageRibbonProcessor extends SequentialIndicatorProcessor<IndicatorCandle, MovingAverageRibbonCheckpoint> {
    readonly lengths: readonly number[];
    private readonly averages;
    constructor(shortPeriod: number, longPeriod: number, ribbonCount: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): MovingAverageRibbonCheckpoint;
    protected restoreState(state: MovingAverageRibbonCheckpoint): void;
}
export declare const MovingAverageRibbonIndicator: IndicatorDefinition<IndicatorCandle, MovingAverageRibbonParameters>;

// Public API module: calc/negativevolumeindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface NegativeVolumeIndexCheckpoint {
    readonly previousClose: number;
    readonly previousVolume: number;
    readonly value: number;
}
export declare class NegativeVolumeIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, NegativeVolumeIndexCheckpoint> {
    private previousClose;
    private previousVolume;
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): NegativeVolumeIndexCheckpoint;
    protected restoreState(state: NegativeVolumeIndexCheckpoint): void;
}
export declare const NegativeVolumeIndexIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/nickrypocktrailingreverse.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface NickRypockTrailingReverseParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiple: number;
}
export interface NickRypockTrailingReverseCheckpoint {
    readonly initialized: boolean;
    readonly k: number;
    readonly reverse: number;
    readonly highPrice: number;
    readonly lowPrice: number;
    readonly trend: -1 | 0 | 1;
    readonly validCount: number;
}
export declare class NickRypockTrailingReverseProcessor extends SequentialIndicatorProcessor<IndicatorCandle, NickRypockTrailingReverseCheckpoint> {
    readonly length: number;
    readonly multiple: number;
    private initialized;
    private k;
    private reverse;
    private highPrice;
    private lowPrice;
    private trend;
    private validCount;
    private readonly multiplier;
    constructor(length: number, multiple: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): NickRypockTrailingReverseCheckpoint;
    protected restoreState(state: NickRypockTrailingReverseCheckpoint): void;
}
export declare const NickRypockTrailingReverseIndicator: IndicatorDefinition<IndicatorCandle, NickRypockTrailingReverseParameters>;

// Public API module: calc/onbalancevolume.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { OnBalanceVolumeCheckpoint } from './shared/momentum-volume.js';
export declare class OnBalanceVolumeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, OnBalanceVolumeCheckpoint> {
    private readonly kernel;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): OnBalanceVolumeCheckpoint;
    protected restoreState(state: OnBalanceVolumeCheckpoint): void;
}
export declare const OnBalanceVolumeIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/onbalancevolumemean.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters, OnBalanceVolumeCheckpoint } from './shared/momentum-volume.js';
export interface OnBalanceVolumeMeanCheckpoint {
    readonly obv: OnBalanceVolumeCheckpoint;
    readonly average: RollingWindowCheckpoint;
}
export declare class OnBalanceVolumeMeanProcessor extends SequentialIndicatorProcessor<IndicatorCandle, OnBalanceVolumeMeanCheckpoint> {
    readonly length: number;
    private readonly obv;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): OnBalanceVolumeMeanCheckpoint;
    protected restoreState(state: OnBalanceVolumeMeanCheckpoint): void;
}
export declare const OnBalanceVolumeMeanIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/optimaltracking.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface OptimalTrackingParameters extends IndicatorParameters {
    readonly length: number;
}
export interface OptimalTrackingCheckpoint {
    readonly validCount: number;
    readonly previousAverage: number;
    readonly previousDifference: number;
    readonly previousHalfRange: number;
    readonly previousResult: number;
    readonly lambda: number;
}
export declare const OPTIMAL_TRACKING_DECAY: number;
export declare const OPTIMAL_TRACKING_WEIGHT: number;
export declare class OptimalTrackingProcessor extends SequentialIndicatorProcessor<IndicatorCandle, OptimalTrackingCheckpoint> {
    readonly length: number;
    private validCount;
    private previousAverage;
    private previousDifference;
    private previousHalfRange;
    private previousResult;
    private lambda;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): OptimalTrackingCheckpoint;
    protected restoreState(state: OptimalTrackingCheckpoint): void;
}
export declare const OptimalTrackingIndicator: IndicatorDefinition<IndicatorCandle, OptimalTrackingParameters>;

// Public API module: calc/oscillatorofmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface OscillatorOfMovingAverageParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface OscillatorOfMovingAverageCheckpoint {
    readonly shortAverage: RollingWindowCheckpoint;
    readonly longAverage: RollingWindowCheckpoint;
}
export declare class OscillatorOfMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, OscillatorOfMovingAverageCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly shortAverage;
    private readonly longAverage;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): OscillatorOfMovingAverageCheckpoint;
    protected restoreState(state: OscillatorOfMovingAverageCheckpoint): void;
}
export declare const OscillatorOfMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, OscillatorOfMovingAverageParameters>;

// Public API module: calc/parabolicsar.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface ParabolicSarParameters extends IndicatorParameters {
    readonly acceleration: number;
    readonly accelerationStep: number;
    readonly accelerationMax: number;
}
export interface ParabolicSarCandleState {
    readonly high: number;
    readonly low: number;
}
export interface ParabolicSarCheckpoint {
    readonly validCandles: number;
    readonly tail: readonly ParabolicSarCandleState[];
    readonly longPosition: boolean;
    readonly extremePoint: number;
    readonly accelerationFactor: number;
    readonly previousBar: number;
    readonly accelerationIncreased: boolean;
    readonly reverseBar: number;
    readonly reverseValue: number;
    readonly previousSar: number;
    readonly todaySar: number;
    readonly lastReturned: number;
}
export interface MutableParabolicSarState {
    validCandles: number;
    tail: ParabolicSarCandleState[];
    longPosition: boolean;
    extremePoint: number;
    accelerationFactor: number;
    previousBar: number;
    accelerationIncreased: boolean;
    reverseBar: number;
    reverseValue: number;
    previousSar: number;
    todaySar: number;
    lastReturned: number;
}
export declare function initialState(): MutableParabolicSarState;
export declare class ParabolicSarProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ParabolicSarCheckpoint> {
    readonly acceleration: number;
    readonly accelerationStep: number;
    readonly accelerationMax: number;
    private state;
    constructor(acceleration: number, accelerationStep: number, accelerationMax: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ParabolicSarCheckpoint;
    protected restoreState(state: ParabolicSarCheckpoint): void;
    private evaluate;
}
export declare const ParabolicSarIndicator: IndicatorDefinition<IndicatorCandle, ParabolicSarParameters>;

// Public API module: calc/passthroughindicator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class PassThroughIndicatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const PassThroughIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/peak.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { ZigZagFamilyProcessor, ZigZagParameters } from './shared/shifted-sparse.js';
export declare class PeakProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number);
}
export declare const PeakIndicator: IndicatorDefinition<IndicatorCandle, ZigZagParameters>;

// Public API module: calc/percentagepriceoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface PercentagePriceOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface PercentagePriceOscillatorCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
}
export declare class PercentagePriceOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PercentagePriceOscillatorCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly short;
    private readonly long;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PercentagePriceOscillatorCheckpoint;
    protected restoreState(state: PercentagePriceOscillatorCheckpoint): void;
}
export declare const PercentagePriceOscillatorIndicator: IndicatorDefinition<IndicatorCandle, PercentagePriceOscillatorParameters>;

// Public API module: calc/percentagepriceoscillatorhistogram.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface PercentagePriceOscillatorHistogramParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly signalMaLength: number;
}
export interface PercentagePriceOscillatorHistogramCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
    readonly signal: FiniteExponentialCheckpoint;
}
export declare class PercentagePriceOscillatorHistogramProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PercentagePriceOscillatorHistogramCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly signalMaLength: number;
    private readonly short;
    private readonly long;
    private readonly signal;
    constructor(shortPeriod: number, longPeriod: number, signalMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PercentagePriceOscillatorHistogramCheckpoint;
    protected restoreState(state: PercentagePriceOscillatorHistogramCheckpoint): void;
}
export declare const PercentagePriceOscillatorHistogramIndicator: IndicatorDefinition<IndicatorCandle, PercentagePriceOscillatorHistogramParameters>;

// Public API module: calc/percentagepriceoscillatorsignal.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { FiniteExponentialCheckpoint } from './shared/compound.js';
export interface PercentagePriceOscillatorSignalParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly signalMaLength: number;
}
export interface PercentagePriceOscillatorSignalCheckpoint {
    readonly short: FiniteExponentialCheckpoint;
    readonly long: FiniteExponentialCheckpoint;
    readonly signal: FiniteExponentialCheckpoint;
}
export declare class PercentagePriceOscillatorSignalProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PercentagePriceOscillatorSignalCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    readonly signalMaLength: number;
    private readonly short;
    private readonly long;
    private readonly signal;
    constructor(shortPeriod: number, longPeriod: number, signalMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PercentagePriceOscillatorSignalCheckpoint;
    protected restoreState(state: PercentagePriceOscillatorSignalCheckpoint): void;
}
export declare const PercentagePriceOscillatorSignalIndicator: IndicatorDefinition<IndicatorCandle, PercentagePriceOscillatorSignalParameters>;

// Public API module: calc/percentagevolumeoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
export interface PercentageVolumeOscillatorParameters extends IndicatorParameters {
    readonly shortPeriod: number;
    readonly longPeriod: number;
}
export interface PercentageVolumeOscillatorCheckpoint {
    readonly short: SeededMovingAverageCheckpoint;
    readonly long: SeededMovingAverageCheckpoint;
}
export declare class PercentageVolumeOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PercentageVolumeOscillatorCheckpoint> {
    readonly shortPeriod: number;
    readonly longPeriod: number;
    private readonly short;
    private readonly long;
    constructor(shortPeriod: number, longPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PercentageVolumeOscillatorCheckpoint;
    protected restoreState(state: PercentageVolumeOscillatorCheckpoint): void;
}
export declare const PercentageVolumeOscillatorIndicator: IndicatorDefinition<IndicatorCandle, PercentageVolumeOscillatorParameters>;

// Public API module: calc/pivotpoints.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class PivotPointsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const PivotPointsIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/positivevolumeindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface PositiveVolumeIndexCheckpoint {
    readonly previousClose: number;
    readonly previousVolume: number;
    readonly value: number;
}
export declare class PositiveVolumeIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PositiveVolumeIndexCheckpoint> {
    private previousClose;
    private previousVolume;
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PositiveVolumeIndexCheckpoint;
    protected restoreState(state: PositiveVolumeIndexCheckpoint): void;
}
export declare const PositiveVolumeIndexIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/prettygoodoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface PrettyGoodOscillatorCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
}
export declare class PrettyGoodOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PrettyGoodOscillatorCheckpoint> {
    readonly length: number;
    private readonly average;
    private readonly highest;
    private readonly lowest;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PrettyGoodOscillatorCheckpoint;
    protected restoreState(state: PrettyGoodOscillatorCheckpoint): void;
}
export declare const PrettyGoodOscillatorIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/pricechannels.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { CompoundLengthParameters } from './shared/compound.js';
export interface PriceChannelsCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare class PriceChannelsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PriceChannelsCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PriceChannelsCheckpoint;
    protected restoreState(state: PriceChannelsCheckpoint): void;
}
export declare const PriceChannelsIndicator: IndicatorDefinition<IndicatorCandle, CompoundLengthParameters>;

// Public API module: calc/pricevolumetrend.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface PriceVolumeTrendCheckpoint {
    readonly previousClose: number;
    readonly value: number;
}
export declare class PriceVolumeTrendProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PriceVolumeTrendCheckpoint> {
    private previousClose;
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PriceVolumeTrendCheckpoint;
    protected restoreState(state: PriceVolumeTrendCheckpoint): void;
}
export declare const PriceVolumeTrendIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/psychologicalline.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface PsychologicalLineCheckpoint {
    readonly closes: RingBufferCheckpoint<number>;
    readonly upCount: number;
}
export declare class PsychologicalLineProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PsychologicalLineCheckpoint> {
    readonly length: number;
    private readonly closes;
    private upCount;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): PsychologicalLineCheckpoint;
    protected restoreState(state: PsychologicalLineCheckpoint): void;
}
export declare const PsychologicalLineIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/qstick.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class QStickProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const QStickIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/rainbowcharts.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorOutputDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface RainbowChartsParameters extends IndicatorParameters {
    readonly lines: number;
}
export interface RainbowChartsCheckpoint {
    readonly averages: readonly RollingWindowCheckpoint[];
}
export declare function rainbowChartsOutputs(parameters: RainbowChartsParameters): readonly IndicatorOutputDefinition[];
export declare const DEFAULT_RAINBOW_CHARTS_OUTPUTS: readonly IndicatorOutputDefinition[];
export declare class RainbowChartsProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RainbowChartsCheckpoint> {
    readonly lines: number;
    private readonly averages;
    constructor(lines: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RainbowChartsCheckpoint;
    protected restoreState(state: RainbowChartsCheckpoint): void;
}
export declare const RainbowChartsIndicator: IndicatorDefinition<IndicatorCandle, RainbowChartsParameters>;

// Public API module: calc/rangeactionverificationindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface RangeActionVerificationIndexParameters extends IndicatorParameters {
    readonly shortSmaLength: number;
    readonly longSmaLength: number;
}
export interface RangeActionVerificationIndexCheckpoint {
    readonly shortAverage: RollingWindowCheckpoint;
    readonly longAverage: RollingWindowCheckpoint;
}
export declare class RangeActionVerificationIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RangeActionVerificationIndexCheckpoint> {
    readonly shortSmaLength: number;
    readonly longSmaLength: number;
    private readonly shortAverage;
    private readonly longAverage;
    constructor(shortSmaLength: number, longSmaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RangeActionVerificationIndexCheckpoint;
    protected restoreState(state: RangeActionVerificationIndexCheckpoint): void;
}
export declare const RangeActionVerificationIndexIndicator: IndicatorDefinition<IndicatorCandle, RangeActionVerificationIndexParameters>;

// Public API module: calc/rankcorrelationindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare function rankCorrelation(values: readonly number[]): number;
export declare class RankCorrelationIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RingBufferCheckpoint<number | null>> {
    readonly length: number;
    private readonly prices;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RingBufferCheckpoint<number | null>;
    protected restoreState(state: RingBufferCheckpoint<number | null>): void;
}
export declare const RankCorrelationIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/rateofchange.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { type IndicatorCalculationResult } from '../sequential-processor.js';
import { BufferedPriceProcessor, MomentumLengthParameters } from './shared/momentum-volume.js';
export declare class RateOfChangeProcessor extends BufferedPriceProcessor {
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
}
export declare const RateOfChangeIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/relativemomentumindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../math/index.js';
export interface RelativeMomentumIndexParameters extends IndicatorParameters {
    readonly length: number;
    readonly momentumPeriod: number;
}
export interface RelativeMomentumIndexCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
}
export declare class RelativeMomentumIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RelativeMomentumIndexCheckpoint> {
    readonly length: number;
    readonly momentumPeriod: number;
    private readonly prices;
    private readonly up;
    private readonly down;
    constructor(length: number, momentumPeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RelativeMomentumIndexCheckpoint;
    protected restoreState(state: RelativeMomentumIndexCheckpoint): void;
}
export declare const RelativeMomentumIndexIndicator: IndicatorDefinition<IndicatorCandle, RelativeMomentumIndexParameters>;

// Public API module: calc/relativestrengthindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export declare const RelativeStrengthIndexIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/relativevigorindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
export interface RelativeVigorIndexParameters extends IndicatorParameters {
    readonly averageLength: number;
    readonly signalLength: number;
}
export interface RelativeVigorSample {
    readonly numerator: number;
    readonly denominator: number;
}
export interface RelativeVigorIndexCheckpoint {
    readonly samples: RingBufferCheckpoint<RelativeVigorSample | null>;
    readonly values: RingBufferCheckpoint<number | null>;
}
export declare class RelativeVigorIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RelativeVigorIndexCheckpoint> {
    readonly averageLength: number;
    readonly signalLength: number;
    private readonly samples;
    private readonly values;
    constructor(averageLength: number, signalLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RelativeVigorIndexCheckpoint;
    protected restoreState(state: RelativeVigorIndexCheckpoint): void;
    private weightedSample;
    private weightedValue;
}
export declare const RelativeVigorIndexIndicator: IndicatorDefinition<IndicatorCandle, RelativeVigorIndexParameters>;

// Public API module: calc/schafftrendcycle.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { FiniteExponentialCheckpoint, MacdCheckpoint } from './shared/compound.js';
export interface SchaffTrendCycleParameters extends IndicatorParameters {
    readonly length: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly stochasticKLength: number;
    readonly signalMaLength: number;
}
export interface SchaffTrendCycleCheckpoint {
    readonly macd: MacdCheckpoint;
    readonly closeHigh: RollingWindowCheckpoint;
    readonly closeLow: RollingWindowCheckpoint;
    readonly stochasticHigh: RollingWindowCheckpoint;
    readonly stochasticLow: RollingWindowCheckpoint;
    readonly average: FiniteExponentialCheckpoint;
    readonly previousStochastic: number;
}
export declare class SchaffTrendCycleProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SchaffTrendCycleCheckpoint> {
    readonly length: number;
    readonly shortMaLength: number;
    readonly longMaLength: number;
    readonly stochasticKLength: number;
    readonly signalMaLength: number;
    private readonly macd;
    private readonly closeHigh;
    private readonly closeLow;
    private readonly stochasticHigh;
    private readonly stochasticLow;
    private readonly average;
    private previousStochastic;
    constructor(length: number, shortMaLength: number, longMaLength: number, stochasticKLength: number, signalMaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SchaffTrendCycleCheckpoint;
    protected restoreState(state: SchaffTrendCycleCheckpoint): void;
}
export declare const SchaffTrendCycleIndicator: IndicatorDefinition<IndicatorCandle, SchaffTrendCycleParameters>;

// Public API module: calc/shared/adaptive.d.ts
import { type IndicatorParameters } from '../../indicator-definition.js';
export declare function parameter(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number;
export interface AdaptiveLengthParameters extends IndicatorParameters {
    readonly length: number;
}

// Public API module: calc/shared/compound.d.ts
import { IndicatorSeriesStyle, type IndicatorParameters } from '../../indicator-definition.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../../math/index.js';
export declare function style(series: IndicatorSeriesStyle, color: string, lineWidth?: number): {
    readonly series: IndicatorSeriesStyle;
    readonly color: string;
    readonly lineWidth: number;
    readonly options: {
        readonly priceLineVisible: false;
    };
};
export declare const RIBBON_COLORS: readonly string[];
export interface BollingerBandsCheckpoint {
    readonly average: RollingWindowCheckpoint;
    readonly deviation: RollingWindowCheckpoint;
}
export interface DonchianChannelsCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export interface FiniteExponentialCheckpoint {
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}
export declare class FiniteExponentialAverage {
    readonly length: number;
    private readonly seed;
    private seedSum;
    private previous;
    private readonly multiplier;
    constructor(length: number);
    get isFormed(): boolean;
    push(value: number | null): number | null;
    preview(value: number | null): number | null;
    reset(): void;
    checkpoint(): FiniteExponentialCheckpoint;
    restore(state: FiniteExponentialCheckpoint): void;
    /** StockSharp's `Buffer.SumNoFirst`: zero for an empty window, the oldest dropped otherwise. */
    private seedNoOldest;
}
export interface CompoundLengthParameters extends IndicatorParameters {
    readonly length: number;
}
export interface MacdCheckpoint {
    readonly fast: FiniteExponentialCheckpoint;
    readonly slow: FiniteExponentialCheckpoint;
    readonly signal: FiniteExponentialCheckpoint;
}
export interface MacdEvaluation {
    readonly macd: number | null;
    readonly signal: number | null;
    readonly histogram: number | null;
}
export declare class MacdKernel {
    private readonly fast;
    private readonly slow;
    private readonly signal;
    constructor(fastLength: number, slowLength: number, signalLength: number);
    get macdIsFormed(): boolean;
    get signalIsFormed(): boolean;
    push(value: number | null): MacdEvaluation;
    preview(value: number | null): MacdEvaluation;
    reset(): void;
    checkpoint(): MacdCheckpoint;
    restore(state: MacdCheckpoint): void;
    private evaluate;
}

// Public API module: calc/shared/core.d.ts
import { type IndicatorCandle, type IndicatorParameters, type IndicatorProcessInput } from '../../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../../sequential-processor.js';
import { type RollingWindowCheckpoint, type SeededMovingAverageCheckpoint } from '../../math/index.js';
export interface LengthIndicatorParameters extends IndicatorParameters {
    readonly length: number;
}
export declare function resolvedLength(parameters: LengthIndicatorParameters, fallback: number, minimum: number): number;
export declare function resolvedInteger(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number;
export declare function close(input: IndicatorProcessInput<IndicatorCandle>): number | null;
export declare class HighestProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly maximum;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare class SmoothedMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SeededMovingAverageCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SeededMovingAverageCheckpoint;
    protected restoreState(state: SeededMovingAverageCheckpoint): void;
}
export declare const LENGTH_STYLE: Readonly<{
    series: "line";
    lineWidth: 2;
    options: Readonly<{
        priceLineVisible: false;
    }>;
}>;

// Public API module: calc/shared/cycle.d.ts
import { type IndicatorParameters } from '../../indicator-definition.js';
export interface CycleLengthParameters extends IndicatorParameters {
    readonly length: number;
}

// Public API module: calc/shared/momentum-volume.d.ts
import { type IndicatorCandle, type IndicatorParameters, type IndicatorProcessInput } from '../../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../../sequential-processor.js';
import { RingBuffer, type RingBufferCheckpoint, type SmoothedMovingAverageCheckpoint } from '../../math/index.js';
export interface MomentumLengthParameters extends IndicatorParameters {
    readonly length: number;
}
export declare function resolvedLength(parameters: MomentumLengthParameters, fallback: number, minimum?: number): number;
export declare function resolvedPeriod(value: unknown, fallback: number, name: string, maximum?: number): number;
export declare function lineStyle(color: string): {
    readonly series: "line";
    readonly color: string;
    readonly lineWidth: 2;
    readonly options: {
        readonly priceLineVisible: false;
    };
};
export declare function lengthParameter(defaultValue: number, minimum?: number): {
    readonly id: 'length';
    readonly name: 'Length';
    readonly type: "integer";
    readonly defaultValue: number;
    readonly min: number;
    readonly max: 500;
    readonly step: 1;
};
export interface RelativeStrengthIndexCheckpoint {
    readonly previousClose: number | null;
    readonly previousResult: number | null;
    readonly validDeltas: number;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}
export declare class RelativeStrengthIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RelativeStrengthIndexCheckpoint> {
    readonly length: number;
    private previousClose;
    private previousResult;
    private validDeltas;
    private readonly gain;
    private readonly loss;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RelativeStrengthIndexCheckpoint;
    protected restoreState(state: RelativeStrengthIndexCheckpoint): void;
}
export interface PriceBufferCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
}
export declare abstract class BufferedPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, PriceBufferCheckpoint> {
    readonly length: number;
    protected readonly prices: RingBuffer<number | null>;
    protected constructor(length: number, outputId: string);
    protected past(): number | null | undefined;
    protected resetState(): void;
    protected captureState(): PriceBufferCheckpoint;
    protected restoreState(state: PriceBufferCheckpoint): void;
}
export interface OnBalanceVolumeCheckpoint {
    readonly previousClose: number;
    readonly cumulative: number;
}
export declare class OnBalanceVolumeKernel {
    private previousClose;
    private cumulative;
    process(candle: Readonly<IndicatorCandle>, commit: boolean): number | null;
    reset(): void;
    checkpoint(): OnBalanceVolumeCheckpoint;
    restore(state: OnBalanceVolumeCheckpoint): void;
}

// Public API module: calc/shared/range.d.ts
import { type IndicatorParameters } from '../../indicator-definition.js';
export interface RangeLengthParameters extends IndicatorParameters {
    readonly length: number;
}
export interface AroonCheckpoint {
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly maximum: number;
    readonly maximumAge: number;
    readonly minimum: number;
    readonly minimumAge: number;
}
export interface AroonValue {
    readonly up: number | null;
    readonly down: number | null;
}
export declare function lineStyle(color: string, lineWidth?: number): {
    readonly series: "line";
    readonly color: string;
    readonly lineWidth: number;
    readonly options: {
        readonly priceLineVisible: false;
    };
};
export declare class AroonKernel {
    readonly windowLength: number;
    private readonly highs;
    private readonly lows;
    private maximum;
    private maximumAge;
    private minimum;
    private minimumAge;
    constructor(windowLength: number);
    push(high: number | null, low: number | null): AroonValue;
    preview(high: number | null, low: number | null): AroonValue;
    reset(): void;
    checkpoint(): AroonCheckpoint;
    restore(state: AroonCheckpoint): void;
    private evaluate;
}

// Public API module: calc/shared/recursive-statistical.d.ts
import { type IndicatorCandle, type IndicatorParameters, type IndicatorProcessInput } from '../../indicator-definition.js';
import { type ExpandingWilderMovingAverageCheckpoint } from '../../math/index.js';
export declare function resolvedLength(parameters: RecursiveLengthParameters, fallback: number, minimum: number, maximum: number): number;
export declare function lineStyle(color: string, width?: number): {
    readonly series: "line";
    readonly color: string;
    readonly lineWidth: number;
    readonly options: {
        readonly priceLineVisible: false;
    };
};
export declare function lengthParameter(defaultValue: number, minimum: number, maximum: number): {
    readonly id: 'length';
    readonly name: 'Length';
    readonly type: "integer";
    readonly defaultValue: number;
    readonly min: number;
    readonly max: number;
    readonly step: 1;
};
export interface RecursiveLengthParameters extends IndicatorParameters {
    readonly length: number;
}
export interface DirectionalCandleSnapshot {
    readonly high: number;
    readonly low: number;
    readonly close: number;
}
export interface DirectionalMovementCheckpoint {
    readonly previousCandle: DirectionalCandleSnapshot | null;
    readonly plus: ExpandingWilderMovingAverageCheckpoint;
    readonly minus: ExpandingWilderMovingAverageCheckpoint;
    readonly trueRange: ExpandingWilderMovingAverageCheckpoint;
}
export interface DirectionalMovementResult {
    readonly plusDI: number | null;
    readonly minusDI: number | null;
    readonly dx: number | null;
}
export declare class DirectionalMovementKernel {
    readonly length: number;
    private previousCandle;
    private readonly plus;
    private readonly minus;
    private readonly trueRange;
    constructor(length: number);
    process(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): DirectionalMovementResult;
    reset(): void;
    checkpoint(): DirectionalMovementCheckpoint;
    restore(state: DirectionalMovementCheckpoint): void;
}

// Public API module: calc/shared/shifted-sparse.d.ts
import { type IndicatorCandle, type IndicatorParameters, type IndicatorProcessInput } from '../../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../../math/index.js';
export declare function period(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number;
export declare function lineStyle(color: string, options?: Readonly<Record<string, string | number | boolean>>): {
    readonly series: "line";
    readonly color: string;
    readonly lineWidth: 1;
    readonly options: {
        readonly priceLineVisible: false;
    };
};
export declare function alligatorParameterSchema(): readonly [{
    readonly id: 'jawLength';
    readonly name: 'Jaw Length';
    readonly type: "integer";
    readonly defaultValue: 13;
    readonly min: 1;
    readonly max: 200;
    readonly step: 1;
}, {
    readonly id: 'jawShift';
    readonly name: 'Jaw Shift';
    readonly type: "integer";
    readonly defaultValue: 8;
    readonly min: 0;
    readonly max: 100;
    readonly step: 1;
}, {
    readonly id: 'teethLength';
    readonly name: 'Teeth Length';
    readonly type: "integer";
    readonly defaultValue: 8;
    readonly min: 1;
    readonly max: 200;
    readonly step: 1;
}, {
    readonly id: 'teethShift';
    readonly name: 'Teeth Shift';
    readonly type: "integer";
    readonly defaultValue: 5;
    readonly min: 0;
    readonly max: 100;
    readonly step: 1;
}, {
    readonly id: 'lipsLength';
    readonly name: 'Lips Length';
    readonly type: "integer";
    readonly defaultValue: 5;
    readonly min: 1;
    readonly max: 200;
    readonly step: 1;
}, {
    readonly id: 'lipsShift';
    readonly name: 'Lips Shift';
    readonly type: "integer";
    readonly defaultValue: 3;
    readonly min: 0;
    readonly max: 100;
    readonly step: 1;
}];
export declare function gatorParameterSchema(): ({
    id: 'jawLength';
    name: 'Jaw Length';
    type: "integer";
    defaultValue: 13;
    min: 1;
    max: 200;
    step: 1;
    aliases: readonly string[];
} | {
    id: 'jawShift';
    name: 'Jaw Shift';
    type: "integer";
    defaultValue: 8;
    min: 0;
    max: 100;
    step: 1;
    aliases: readonly string[];
} | {
    id: 'teethLength';
    name: 'Teeth Length';
    type: "integer";
    defaultValue: 8;
    min: 1;
    max: 200;
    step: 1;
    aliases: readonly string[];
} | {
    id: 'teethShift';
    name: 'Teeth Shift';
    type: "integer";
    defaultValue: 5;
    min: 0;
    max: 100;
    step: 1;
    aliases: readonly string[];
} | {
    id: 'lipsLength';
    name: 'Lips Length';
    type: "integer";
    defaultValue: 5;
    min: 1;
    max: 200;
    step: 1;
    aliases: readonly string[];
} | {
    id: 'lipsShift';
    name: 'Lips Shift';
    type: "integer";
    defaultValue: 3;
    min: 0;
    max: 100;
    step: 1;
    aliases: readonly string[];
})[];
export declare function validWindow(value: unknown, capacity: number): value is RollingWindowCheckpoint;
export interface AlligatorParameters extends IndicatorParameters {
    readonly jawLength: number;
    readonly jawShift: number;
    readonly teethLength: number;
    readonly teethShift: number;
    readonly lipsLength: number;
    readonly lipsShift: number;
}
export interface ZigZagParameters extends IndicatorParameters {
    readonly deviation: number;
}
export interface ZigZagCheckpoint {
    readonly disabled: boolean;
    readonly previousClose: number | null;
    readonly lastExtremum: number | null;
    readonly isUpTrend: boolean | null;
    readonly shift: number;
}
export type ZigZagSource = 'close' | 'high' | 'low';
export type ZigZagDirection = 'both' | 'up' | 'down';
export declare class ZigZagFamilyProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ZigZagCheckpoint> {
    readonly deviation: number;
    private readonly source;
    private readonly direction;
    private disabled;
    private previousPrice;
    private lastExtremum;
    private isUpTrend;
    private shift;
    constructor(deviation: number, source: ZigZagSource, direction: ZigZagDirection);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ZigZagCheckpoint;
    protected restoreState(state: ZigZagCheckpoint): void;
}
export declare function strictDeviation(value: unknown): number;

// Public API module: calc/shift.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface ShiftParameters extends IndicatorParameters {
    readonly length: number;
}
/** StockSharp Shift is a warm-up gate; it does not relocate output points. */
export declare class ShiftProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    readonly length: number;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const ShiftIndicator: IndicatorDefinition<IndicatorCandle, ShiftParameters>;

// Public API module: calc/simplemovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class SimpleMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const SimpleMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/sinewave.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { CycleLengthParameters } from './shared/cycle.js';
export declare class SineWaveProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    readonly length: number;
    private readonly step;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const SineWaveIndicator: IndicatorDefinition<IndicatorCandle, CycleLengthParameters>;

// Public API module: calc/smoothedmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare const SmoothedMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/standarddeviation.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class StandardDeviationProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly deviation;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const StandardDeviationIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/standarderror.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingLinearRegressionCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class StandardErrorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingLinearRegressionCheckpoint> {
    readonly length: number;
    private readonly regression;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingLinearRegressionCheckpoint;
    protected restoreState(state: RollingLinearRegressionCheckpoint): void;
}
export declare const StandardErrorIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/stochastick.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface StochasticKCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare class StochasticKProcessor extends SequentialIndicatorProcessor<IndicatorCandle, StochasticKCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): StochasticKCheckpoint;
    protected restoreState(state: StochasticKCheckpoint): void;
}
export declare const StochasticKIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/stochasticoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface StochasticParameters extends IndicatorParameters {
    readonly kLength: number;
    readonly dLength: number;
}
export interface StochasticCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
    readonly d: RollingWindowCheckpoint;
}
export declare class StochasticProcessor extends SequentialIndicatorProcessor<IndicatorCandle, StochasticCheckpoint> {
    readonly kLength: number;
    readonly dLength: number;
    private readonly high;
    private readonly low;
    private readonly d;
    constructor(kLength: number, dLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): StochasticCheckpoint;
    protected restoreState(state: StochasticCheckpoint): void;
}
export declare const StochasticIndicator: IndicatorDefinition<IndicatorCandle, StochasticParameters>;

// Public API module: calc/sum.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class SumProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly sum;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const SumIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/supertrend.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type ExpandingAverageTrueRangeCheckpoint } from '../math/index.js';
export interface SuperTrendParameters extends IndicatorParameters {
    readonly length: number;
    readonly multiplier: number;
}
export interface SuperTrendCheckpoint {
    readonly averageTrueRange: ExpandingAverageTrueRangeCheckpoint;
    readonly previousSupertrend: number | null;
    readonly previousClose: number | null;
    readonly previousUpperBand: number | null;
    readonly previousLowerBand: number | null;
    readonly trend: -1 | 1;
}
/** StockSharp SuperTrend with direction carried as painter metadata. */
export declare class SuperTrendProcessor extends SequentialIndicatorProcessor<IndicatorCandle, SuperTrendCheckpoint> {
    readonly length: number;
    readonly multiplier: number;
    private readonly averageTrueRange;
    private previousSupertrend;
    private previousClose;
    private previousUpperBand;
    private previousLowerBand;
    private trend;
    constructor(length: number, multiplier: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): SuperTrendCheckpoint;
    protected restoreState(state: SuperTrendCheckpoint): void;
}
export declare const SuperTrendIndicator: IndicatorDefinition<IndicatorCandle, SuperTrendParameters>;

// Public API module: calc/t3movingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type PartialSeedExponentialMovingAverageCheckpoint } from '../math/index.js';
export interface T3MovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly volumeFactor: number;
}
export interface T3MovingAverageCheckpoint {
    readonly averages: readonly PartialSeedExponentialMovingAverageCheckpoint[];
    readonly warmUpPeriod: number;
}
export declare const T3_AVERAGE_COUNT = 6;
export declare const T3_WARM_UP_PERIOD = 10;
export declare class T3MovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, T3MovingAverageCheckpoint> {
    readonly length: number;
    readonly volumeFactor: number;
    private readonly averages;
    private readonly coefficients;
    private warmUpPeriod;
    constructor(length: number, volumeFactor: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): T3MovingAverageCheckpoint;
    protected restoreState(state: T3MovingAverageCheckpoint): void;
}
export declare const T3MovingAverageIndicator: IndicatorDefinition<IndicatorCandle, T3MovingAverageParameters>;

// Public API module: calc/timeweightedaverageprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface TimeWeightedAveragePriceCheckpoint {
    readonly sum: number;
    readonly count: number;
}
export declare class TimeWeightedAveragePriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TimeWeightedAveragePriceCheckpoint> {
    private sum;
    private count;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TimeWeightedAveragePriceCheckpoint;
    protected restoreState(state: TimeWeightedAveragePriceCheckpoint): void;
}
export declare const TimeWeightedAveragePriceIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/tripleexponentialmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { CompoundLengthParameters, FiniteExponentialCheckpoint } from './shared/compound.js';
export interface TripleExponentialMovingAverageCheckpoint {
    readonly first: SeededMovingAverageCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
    readonly third: FiniteExponentialCheckpoint;
}
export declare class TripleExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TripleExponentialMovingAverageCheckpoint> {
    readonly length: number;
    private readonly first;
    private readonly second;
    private readonly third;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TripleExponentialMovingAverageCheckpoint;
    protected restoreState(state: TripleExponentialMovingAverageCheckpoint): void;
}
export declare const TripleExponentialMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, CompoundLengthParameters>;

// Public API module: calc/trix.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { CompoundLengthParameters, FiniteExponentialCheckpoint } from './shared/compound.js';
export interface TrixCheckpoint {
    readonly first: FiniteExponentialCheckpoint;
    readonly second: FiniteExponentialCheckpoint;
    readonly third: FiniteExponentialCheckpoint;
    readonly rateOfChange: RingBufferCheckpoint<number>;
}
export interface TrixParameters extends CompoundLengthParameters {
    readonly rocLength: number;
}
export declare class TrixProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TrixCheckpoint> {
    readonly length: number;
    readonly rocLength: number;
    private readonly first;
    private readonly second;
    private readonly third;
    private readonly rateOfChange;
    constructor(length: number, rocLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TrixCheckpoint;
    protected restoreState(state: TrixCheckpoint): void;
}
export declare const TrixIndicator: IndicatorDefinition<IndicatorCandle, TrixParameters>;

// Public API module: calc/trough.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { ZigZagFamilyProcessor, ZigZagParameters } from './shared/shifted-sparse.js';
export declare class TroughProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number);
}
export declare const TroughIndicator: IndicatorDefinition<IndicatorCandle, ZigZagParameters>;

// Public API module: calc/truerange.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface TrueRangeIndicatorCheckpoint {
    readonly previousClose: number | null;
}
export declare class TrueRangeProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TrueRangeIndicatorCheckpoint> {
    private previousClose;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TrueRangeIndicatorCheckpoint;
    protected restoreState(state: TrueRangeIndicatorCheckpoint): void;
}
export declare const TrueRangeIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/truestrengthindex.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type PartialSeedExponentialMovingAverageCheckpoint } from '../math/index.js';
export interface TrueStrengthIndexParameters extends IndicatorParameters {
    readonly firstLength: number;
    readonly secondLength: number;
    readonly signalLength: number;
}
export interface TrueStrengthIndexCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly firstMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly firstAbsoluteMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly doubleMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly doubleAbsoluteMomentum: PartialSeedExponentialMovingAverageCheckpoint;
    readonly signal: PartialSeedExponentialMovingAverageCheckpoint;
}
export declare class TrueStrengthIndexProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TrueStrengthIndexCheckpoint> {
    readonly firstLength: number;
    readonly secondLength: number;
    readonly signalLength: number;
    private initialized;
    private previousClose;
    private readonly firstMomentum;
    private readonly firstAbsoluteMomentum;
    private readonly doubleMomentum;
    private readonly doubleAbsoluteMomentum;
    private readonly signal;
    constructor(firstLength: number, secondLength: number, signalLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TrueStrengthIndexCheckpoint;
    protected restoreState(state: TrueStrengthIndexCheckpoint): void;
}
export declare const TrueStrengthIndexIndicator: IndicatorDefinition<IndicatorCandle, TrueStrengthIndexParameters>;

// Public API module: calc/twiggsmoneyflow.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type SeededMovingAverageCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface TwiggsMoneyFlowCheckpoint {
    readonly advanceDecline: SeededMovingAverageCheckpoint;
    readonly volume: SeededMovingAverageCheckpoint;
    readonly previousAdvanceDecline: number;
}
export declare class TwiggsMoneyFlowProcessor extends SequentialIndicatorProcessor<IndicatorCandle, TwiggsMoneyFlowCheckpoint> {
    readonly length: number;
    private readonly advanceDecline;
    private readonly volume;
    private previousAdvanceDecline;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): TwiggsMoneyFlowCheckpoint;
    protected restoreState(state: TwiggsMoneyFlowCheckpoint): void;
}
export declare const TwiggsMoneyFlowIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/typicalprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class TypicalPriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const TypicalPriceIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/ultimateoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
export interface UltimateOscillatorCheckpoint {
    readonly previousClose: number | null;
    readonly buyingPressure: readonly RollingWindowCheckpoint[];
    readonly trueRange: readonly RollingWindowCheckpoint[];
}
export declare const ULTIMATE_OSCILLATOR_PERIODS: readonly number[];
export declare const ULTIMATE_OSCILLATOR_WEIGHTS: readonly number[];
export declare class UltimateOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, UltimateOscillatorCheckpoint> {
    private previousClose;
    private readonly buyingPressure;
    private readonly trueRange;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): UltimateOscillatorCheckpoint;
    protected restoreState(state: UltimateOscillatorCheckpoint): void;
}
export declare const UltimateOscillatorIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/variablemovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../math/index.js';
export interface VariableMovingAverageParameters extends IndicatorParameters {
    readonly length: number;
    readonly volatilityIndex: number;
}
export interface VariableMovingAverageCheckpoint {
    readonly initialized: boolean;
    readonly deviation: RollingWindowCheckpoint;
    readonly prices: RingBufferCheckpoint<number>;
    readonly previous: number;
}
export declare class VariableMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VariableMovingAverageCheckpoint> {
    readonly length: number;
    readonly volatilityIndex: number;
    private initialized;
    private readonly deviation;
    private readonly prices;
    private priceSum;
    private previous;
    constructor(length: number, volatilityIndex: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VariableMovingAverageCheckpoint;
    protected restoreState(state: VariableMovingAverageCheckpoint): void;
}
export declare const VariableMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, VariableMovingAverageParameters>;

// Public API module: calc/verticalhorizontalfilter.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export interface VerticalHorizontalFilterCheckpoint {
    readonly previousClose: number | null;
    readonly highest: RollingWindowCheckpoint;
    readonly lowest: RollingWindowCheckpoint;
    readonly movement: RollingWindowCheckpoint;
}
export declare class VerticalHorizontalFilterProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VerticalHorizontalFilterCheckpoint> {
    readonly length: number;
    private previousClose;
    private readonly highest;
    private readonly lowest;
    private readonly movement;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VerticalHorizontalFilterCheckpoint;
    protected restoreState(state: VerticalHorizontalFilterCheckpoint): void;
}
export declare const VerticalHorizontalFilterIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/vidya.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type RollingWindowCheckpoint } from '../math/index.js';
import { AdaptiveLengthParameters } from './shared/adaptive.js';
export interface VidyaCheckpoint {
    readonly initialized: boolean;
    readonly previousClose: number | null;
    readonly up: RollingWindowCheckpoint;
    readonly down: RollingWindowCheckpoint;
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}
export declare class VidyaProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VidyaCheckpoint> {
    readonly length: number;
    private initialized;
    private previousClose;
    private readonly up;
    private readonly down;
    private readonly seed;
    private seedSum;
    private previous;
    private readonly multiplier;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VidyaCheckpoint;
    protected restoreState(state: VidyaCheckpoint): void;
}
export declare const VidyaIndicator: IndicatorDefinition<IndicatorCandle, AdaptiveLengthParameters>;

// Public API module: calc/volumeindicator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
/** Stateless candle-volume pass-through with a painter direction hint. */
export declare class VolumeIndicatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const VolumeIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/volumeweightedaverageprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface VolumeWeightedAveragePriceCheckpoint {
    readonly priceVolume: number;
    readonly volume: number;
}
export declare class VolumeWeightedAveragePriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VolumeWeightedAveragePriceCheckpoint> {
    private priceVolume;
    private volume;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VolumeWeightedAveragePriceCheckpoint;
    protected restoreState(state: VolumeWeightedAveragePriceCheckpoint): void;
}
export declare const VolumeWeightedAveragePriceIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/volumeweightedmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface VolumeWeightedMovingAverageCheckpoint {
    readonly numerator: RollingWindowCheckpoint;
    readonly denominator: RollingWindowCheckpoint;
}
export declare class VolumeWeightedMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VolumeWeightedMovingAverageCheckpoint> {
    readonly length: number;
    private readonly numerator;
    private readonly denominator;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VolumeWeightedMovingAverageCheckpoint;
    protected restoreState(state: VolumeWeightedMovingAverageCheckpoint): void;
}
export declare const VolumeWeightedMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/vortexindicator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { RangeLengthParameters } from './shared/range.js';
export interface VortexIndicatorCheckpoint {
    readonly previousHigh: number | null;
    readonly previousLow: number | null;
    readonly previousClose: number | null;
    readonly trueRange: RollingWindowCheckpoint;
    readonly positiveMovement: RollingWindowCheckpoint;
    readonly negativeMovement: RollingWindowCheckpoint;
}
export declare class VortexIndicatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, VortexIndicatorCheckpoint> {
    readonly length: number;
    private previousHigh;
    private previousLow;
    private previousClose;
    private readonly trueRange;
    private readonly positiveMovement;
    private readonly negativeMovement;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): VortexIndicatorCheckpoint;
    protected restoreState(state: VortexIndicatorCheckpoint): void;
}
export declare const VortexIndicator: IndicatorDefinition<IndicatorCandle, RangeLengthParameters>;

// Public API module: calc/wavetrendoscillator.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint, type SeededMovingAverageCheckpoint } from '../math/index.js';
export interface WaveTrendOscillatorParameters extends IndicatorParameters {
    readonly esaPeriod: number;
    readonly dPeriod: number;
    readonly averagePeriod: number;
}
export interface WaveTrendOscillatorCheckpoint {
    readonly esa: SeededMovingAverageCheckpoint;
    readonly deviation: SeededMovingAverageCheckpoint;
    readonly average: RingBufferCheckpoint<number>;
}
export declare class WaveTrendOscillatorProcessor extends SequentialIndicatorProcessor<IndicatorCandle, WaveTrendOscillatorCheckpoint> {
    readonly esaPeriod: number;
    readonly dPeriod: number;
    readonly averagePeriod: number;
    private readonly esa;
    private readonly deviation;
    private readonly average;
    constructor(esaPeriod: number, dPeriod: number, averagePeriod: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): WaveTrendOscillatorCheckpoint;
    protected restoreState(state: WaveTrendOscillatorCheckpoint): void;
    private empty;
}
export declare const WaveTrendOscillatorIndicator: IndicatorDefinition<IndicatorCandle, WaveTrendOscillatorParameters>;

// Public API module: calc/weightedcloseprice.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export declare class WeightedClosePriceProcessor extends SequentialIndicatorProcessor<IndicatorCandle, null> {
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, _commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): null;
    protected restoreState(state: null): void;
}
export declare const WeightedClosePriceIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/weightedmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export declare class WeightedMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, RollingWindowCheckpoint> {
    readonly length: number;
    private readonly average;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): RollingWindowCheckpoint;
    protected restoreState(state: RollingWindowCheckpoint): void;
}
export declare const WeightedMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/wildermovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { LengthIndicatorParameters, SmoothedMovingAverageProcessor } from './shared/core.js';
/** Public Wilder indicator shares the same seeded recursion as batch SMMA. */
export declare class WilderMovingAverageProcessor extends SmoothedMovingAverageProcessor {
}
export declare const WilderMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/williamsaccumulationdistribution.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface WilliamsAccumulationDistributionCheckpoint {
    readonly previousClose: number;
    readonly value: number;
}
export declare class WilliamsAccumulationDistributionProcessor extends SequentialIndicatorProcessor<IndicatorCandle, WilliamsAccumulationDistributionCheckpoint> {
    private previousClose;
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): WilliamsAccumulationDistributionCheckpoint;
    protected restoreState(state: WilliamsAccumulationDistributionCheckpoint): void;
    private empty;
}
export declare const WilliamsAccumulationDistributionIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/williamsr.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint } from '../math/index.js';
import { MomentumLengthParameters } from './shared/momentum-volume.js';
export interface WilliamsRCheckpoint {
    readonly high: RollingWindowCheckpoint;
    readonly low: RollingWindowCheckpoint;
}
export declare class WilliamsRProcessor extends SequentialIndicatorProcessor<IndicatorCandle, WilliamsRCheckpoint> {
    readonly length: number;
    private readonly high;
    private readonly low;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): WilliamsRCheckpoint;
    protected restoreState(state: WilliamsRCheckpoint): void;
}
export declare const WilliamsRIndicator: IndicatorDefinition<IndicatorCandle, MomentumLengthParameters>;

// Public API module: calc/williamsvariableaccumulationdistribution.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
export interface WilliamsVariableAccumulationDistributionCheckpoint {
    readonly value: number;
}
export declare class WilliamsVariableAccumulationDistributionProcessor extends SequentialIndicatorProcessor<IndicatorCandle, WilliamsVariableAccumulationDistributionCheckpoint> {
    private current;
    constructor();
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): WilliamsVariableAccumulationDistributionCheckpoint;
    protected restoreState(state: WilliamsVariableAccumulationDistributionCheckpoint): void;
}
export declare const WilliamsVariableAccumulationDistributionIndicator: IndicatorDefinition<IndicatorCandle, IndicatorParameters>;

// Public API module: calc/woodiescci.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorParameters, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RollingWindowCheckpoint, type RingBufferCheckpoint } from '../math/index.js';
export interface WoodiesCciParameters extends IndicatorParameters {
    readonly length: number;
    readonly smaLength: number;
}
export interface WoodiesCciCheckpoint {
    readonly cci: RingBufferCheckpoint<number | null>;
    readonly signal: RollingWindowCheckpoint;
}
export declare class WoodiesCciProcessor extends SequentialIndicatorProcessor<IndicatorCandle, WoodiesCciCheckpoint> {
    readonly length: number;
    readonly smaLength: number;
    private readonly cci;
    private readonly signal;
    constructor(length: number, smaLength: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): WoodiesCciCheckpoint;
    protected restoreState(state: WoodiesCciCheckpoint): void;
}
export declare const WoodiesCciIndicator: IndicatorDefinition<IndicatorCandle, WoodiesCciParameters>;

// Public API module: calc/zerolagexponentialmovingaverage.d.ts
import { type IndicatorCandle, type IndicatorDefinition, type IndicatorProcessInput } from '../indicator-definition.js';
import { SequentialIndicatorProcessor, type IndicatorCalculationResult } from '../sequential-processor.js';
import { type RingBufferCheckpoint } from '../math/index.js';
import { LengthIndicatorParameters } from './shared/core.js';
export interface ZeroLagExponentialMovingAverageCheckpoint {
    readonly prices: RingBufferCheckpoint<number | null>;
    readonly previous: number;
}
export declare class ZeroLagExponentialMovingAverageProcessor extends SequentialIndicatorProcessor<IndicatorCandle, ZeroLagExponentialMovingAverageCheckpoint> {
    readonly length: number;
    private readonly prices;
    private readonly lag;
    private readonly multiplier;
    private previous;
    constructor(length: number);
    protected calculate(input: IndicatorProcessInput<IndicatorCandle>, commit: boolean): IndicatorCalculationResult;
    protected resetState(): void;
    protected captureState(): ZeroLagExponentialMovingAverageCheckpoint;
    protected restoreState(state: ZeroLagExponentialMovingAverageCheckpoint): void;
}
export declare const ZeroLagExponentialMovingAverageIndicator: IndicatorDefinition<IndicatorCandle, LengthIndicatorParameters>;

// Public API module: calc/zigzag.d.ts
import { type IndicatorCandle, type IndicatorDefinition } from '../indicator-definition.js';
import { ZigZagFamilyProcessor, ZigZagParameters } from './shared/shifted-sparse.js';
export declare class ZigZagProcessor extends ZigZagFamilyProcessor {
    constructor(deviation: number);
}
export declare function zigZagDeviation(value: unknown): number;
export declare const ZigZagIndicator: IndicatorDefinition<IndicatorCandle, ZigZagParameters>;

// Public API module: indicator-catalog.d.ts
/**
 * English label of a parameter, output or indicator key, derived from its camelCase spelling.
 *
 * This IS the i18n key: `T.t(humanize(key))` resolves it against the host's dictionary and falls
 * back to the English here, so no separate label is stored anywhere -- the key is the single
 * source for both the identifier and what is shown.
 */
export declare function humanize(key: string): string;
/** The short names a kind also answers to, e.g. `sma` for SimpleMovingAverage. */
export declare function getIndicatorAliases(kind: string): string[];
/**
 * Every runnable indicator, as a flat record per kind.
 *
 * Built from the definitions themselves. There used to be a catalog.json alongside them repeating
 * the name, group, pane, outputs and parameters of every indicator, and the two had already
 * drifted -- three names, eleven groups and four parameter bounds disagreed, with nothing deciding
 * which was right. The definition is what actually runs, so it is the one that describes itself.
 */
export declare function getClientCatalog(): any[];

// Public API module: indicator-definition.d.ts
import type { CandlestickData, Time } from './types.js';
export interface IndicatorCandle extends CandlestickData {
    readonly volume?: number;
}
export declare const IndicatorCategory: Readonly<{
    readonly Trend: 'trend';
    readonly Momentum: 'momentum';
    readonly Volatility: 'volatility';
    readonly Volume: 'volume';
    readonly Price: 'price';
    readonly MarketStrength: 'market-strength';
    readonly SupportResistance: 'support-resistance';
    readonly Cycle: 'cycle';
    readonly Statistical: 'statistical';
}>;
export type IndicatorCategory = typeof IndicatorCategory[keyof typeof IndicatorCategory];
export declare const IndicatorInputKind: Readonly<{
    readonly Candlestick: 'candlestick';
    readonly Scalar: 'scalar';
}>;
export type IndicatorInputKind = typeof IndicatorInputKind[keyof typeof IndicatorInputKind];
export declare const IndicatorInputFieldType: Readonly<{
    readonly Number: 'number';
}>;
export type IndicatorInputFieldType = typeof IndicatorInputFieldType[keyof typeof IndicatorInputFieldType];
export interface IndicatorInputField {
    readonly id: string;
    readonly type: IndicatorInputFieldType;
    readonly required: boolean;
}
export interface IndicatorInputSchema {
    readonly kind: IndicatorInputKind;
    readonly fields: readonly IndicatorInputField[];
}
export declare const IndicatorParameterType: Readonly<{
    readonly Number: 'number';
    readonly Integer: 'integer';
    readonly Boolean: 'boolean';
    readonly String: 'string';
}>;
export type IndicatorParameterType = typeof IndicatorParameterType[keyof typeof IndicatorParameterType];
export type IndicatorParameterValue = number | boolean | string;
export type IndicatorParameters = Readonly<Record<string, IndicatorParameterValue>>;
export interface IndicatorParameterDefinition {
    readonly id: string;
    readonly aliases?: readonly string[];
    readonly name: string;
    readonly description?: string;
    readonly type: IndicatorParameterType;
    readonly defaultValue: IndicatorParameterValue;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly options?: readonly string[];
}
export declare const IndicatorSeriesStyle: Readonly<{
    readonly Line: 'line';
    readonly Histogram: 'histogram';
    readonly Area: 'area';
    readonly Band: 'band';
    readonly Markers: 'markers';
}>;
export type IndicatorSeriesStyle = typeof IndicatorSeriesStyle[keyof typeof IndicatorSeriesStyle];
export interface IndicatorOutputStyle {
    readonly series: IndicatorSeriesStyle;
    readonly color?: string;
    readonly lineWidth?: number;
    readonly visible?: boolean;
    readonly options?: Readonly<Record<string, string | number | boolean>>;
}
export interface IndicatorOutputDefinition {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly defaultStyle: IndicatorOutputStyle;
}
export type IndicatorOutputFactory<TParameters extends IndicatorParameters> = (parameters: TParameters) => readonly IndicatorOutputDefinition[];
export declare const IndicatorPane: Readonly<{
    readonly Overlay: 'overlay';
    readonly Separate: 'separate';
}>;
export type IndicatorPane = typeof IndicatorPane[keyof typeof IndicatorPane];
export declare const IndicatorMeasure: Readonly<{
    readonly Price: 'price';
    readonly Percent: 'percent';
    readonly MinusOnePlusOne: 'minus-one-plus-one';
    readonly Volume: 'volume';
}>;
export type IndicatorMeasure = typeof IndicatorMeasure[keyof typeof IndicatorMeasure];
/** One source value passed to an incremental processor. */
export interface IndicatorProcessInput<TInput> {
    readonly index: number;
    readonly time: Time;
    readonly value: Readonly<TInput>;
    /** False means preview the current input without mutating committed state. */
    readonly isFinal: boolean;
}
/** Immutable painter fields carried alongside one numeric output value. */
export type IndicatorOutputMetadataValue = string | number | boolean | null;
export type IndicatorOutputMetadata = Readonly<Record<string, IndicatorOutputMetadataValue>>;
/** One named numeric value, placed at an explicit logical input index. */
export interface IndicatorOutputValue {
    readonly outputId: string;
    readonly value: number | null;
    readonly targetIndex: number;
    /** Optional flat fields forwarded to the rendered data point. */
    readonly metadata?: IndicatorOutputMetadata;
}
export interface IndicatorProcessResult {
    readonly sourceIndex: number;
    readonly isFormed: boolean;
    readonly values: readonly IndicatorOutputValue[];
}
/**
 * Stateful incremental processor. A non-final process call must leave the
 * checkpoint byte-for-byte equivalent to the state before that call.
 */
export interface IIndicatorProcessor<TInput> {
    readonly position: number;
    reset(): void;
    process(input: IndicatorProcessInput<TInput>): IndicatorProcessResult;
    checkpoint(): unknown;
    restore(checkpoint: unknown): void;
}
export type IndicatorProcessorFactory<TInput, TParameters extends IndicatorParameters> = (parameters: TParameters) => IIndicatorProcessor<TInput>;
/** Metadata and executable factory for one genuinely incremental indicator. */
export interface IndicatorDefinition<TInput = IndicatorCandle, TParameters extends IndicatorParameters = IndicatorParameters> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly category: IndicatorCategory;
    readonly input: IndicatorInputSchema;
    readonly parameters: readonly IndicatorParameterDefinition[];
    readonly outputs: readonly IndicatorOutputDefinition[];
    /** Resolves parameter-dependent outputs; `outputs` describes the default parameters. */
    readonly outputFactory?: IndicatorOutputFactory<TParameters>;
    readonly naturalPane: IndicatorPane;
    readonly measure: IndicatorMeasure;
    /**
     * Short names this indicator also answers to -- `sma`, `rsi`, `bb`. A search box matches on
     * them, and a saved layout written against one keeps working. Declared here because they name
     * this indicator and nothing else.
     */
    readonly aliases?: readonly string[];
    /**
     * How a host should draw this indicator, when a plain line will not do -- a band, a histogram,
     * a pair of stochastic lines. The painter is named by the indicator because only the indicator
     * knows what its outputs mean; a painter cannot pick itself.
     */
    readonly painter?: string;
    /**
     * The scale the pane should span, when the indicator has a natural one: 0..100 for an
     * oscillator, -1..+1 for a correlation. Not derivable from `measure` -- two percent-measure
     * indicators can want 0..100 and -100..+100 -- so it is stated rather than inferred.
     */
    readonly scaleRange?: {
        readonly min: number;
        readonly max: number;
    };
    /**
     * Where a host should draw reference lines across the pane: 30 and 70 on an RSI, 20 and 80 on
     * a stochastic. Ornament rather than arithmetic, and the numbers belong to the indicator --
     * which is why they are here and not in whichever painter happens to draw it.
     */
    readonly levels?: readonly number[];
    readonly processorFactory: IndicatorProcessorFactory<TInput, TParameters>;
}
export declare function resolveIndicatorOutputs<TInput, TParameters extends IndicatorParameters>(definition: IndicatorDefinition<TInput, TParameters>, parameters: TParameters): readonly IndicatorOutputDefinition[];
export declare function resolveIndicatorParameters<TInput, TParameters extends IndicatorParameters>(definition: IndicatorDefinition<TInput, TParameters>, parameters: TParameters): TParameters;
export declare const CandlestickIndicatorInput: IndicatorInputSchema;

// Public API module: indicator-output-style.d.ts
import type { LineStyleValue } from './types.js';
/** Effective editor-facing appearance of one semantic indicator output. */
export interface IndicatorOutputAppearance {
    readonly color?: string;
    readonly lineWidth?: number;
    readonly lineStyle?: LineStyleValue;
    readonly visible: boolean;
    readonly precision?: number;
}
/** Fields accepted by a live output-style edit. Omitted fields stay unchanged. */
export interface IndicatorOutputStylePatch {
    readonly color?: string;
    /** Null clears an explicit width and returns to the renderer default. */
    readonly lineWidth?: number | null;
    /** Null clears an explicit dash style and returns to the renderer default. */
    readonly lineStyle?: LineStyleValue | null;
    readonly visible?: boolean;
    /** Null clears an explicit precision and returns to the series formatter. */
    readonly precision?: number | null;
}
/** Validates and freezes an editor supplied partial appearance. */
export declare function normalizeIndicatorOutputStylePatch(value: unknown): IndicatorOutputStylePatch;

// Public API module: indicator-registry.d.ts
import { type IndicatorDefinition, type IndicatorParameters } from './indicator-definition.js';
/** Registry for definitions backed by real incremental processors. */
export declare class IndicatorRegistry {
    private readonly definitions;
    register<TInput, TParameters extends IndicatorParameters>(definition: IndicatorDefinition<TInput, TParameters>): IndicatorDefinition<TInput, TParameters>;
    unregister(id: string): boolean;
    has(id: string): boolean;
    get(id: string): IndicatorDefinition<any, any> | undefined;
    all(): readonly IndicatorDefinition<any, any>[];
}
export declare const indicatorRegistry: IndicatorRegistry;
export declare function registerIndicator<TInput, TParameters extends IndicatorParameters>(definition: IndicatorDefinition<TInput, TParameters>): IndicatorDefinition<TInput, TParameters>;
export declare function unregisterIndicator(id: string): boolean;
export declare function getIndicatorDefinition(id: string): IndicatorDefinition<any, any> | undefined;
export declare function getIndicatorDefinitions(): readonly IndicatorDefinition<any, any>[];

// Public API module: indicator-runtime.d.ts
import type { Time } from './types.js';
import type { IndicatorDefinition, IndicatorOutputMetadata, IndicatorOutputDefinition, IndicatorParameters } from './indicator-definition.js';
export interface IndicatorRuntimeInput<TInput> {
    readonly time: Time;
    readonly value: TInput;
}
export interface IndicatorRuntimePoint {
    readonly outputId: string;
    readonly sourceIndex: number;
    readonly targetIndex: number;
    /** Null only while a forward-shifted target bar does not exist yet. */
    readonly time: Time | null;
    readonly value: number;
    /** Optional flat fields forwarded to the rendered data point. */
    readonly metadata?: IndicatorOutputMetadata;
}
export declare const IndicatorPatchOperation: Readonly<{
    readonly Append: 'append';
    readonly Replace: 'replace';
    readonly Remove: 'remove';
}>;
export type IndicatorPatchOperation = typeof IndicatorPatchOperation[keyof typeof IndicatorPatchOperation];
export interface IndicatorRuntimePatchOperation {
    readonly operation: IndicatorPatchOperation;
    readonly outputId: string;
    readonly targetIndex: number;
    readonly point?: IndicatorRuntimePoint;
}
export declare const IndicatorRuntimePatchKind: Readonly<{
    readonly Reset: 'reset';
    readonly Update: 'update';
    readonly Correction: 'correction';
}>;
export type IndicatorRuntimePatchKind = typeof IndicatorRuntimePatchKind[keyof typeof IndicatorRuntimePatchKind];
export interface IndicatorRuntimePatch {
    readonly revision: number;
    readonly kind: IndicatorRuntimePatchKind;
    readonly fromIndex: number;
    readonly operations: readonly IndicatorRuntimePatchOperation[];
}
export interface IndicatorRuntimeSnapshot {
    readonly revision: number;
    readonly committedInputs: number;
    /** First committed input whose value is still retained for correction replay. */
    readonly retainedFrom: number;
    readonly hasPreview: boolean;
    readonly outputPoints: number;
    readonly checkpoints: number;
}
export interface IndicatorRuntimeOptions<TInput, TParameters extends IndicatorParameters> {
    readonly definition: IndicatorDefinition<TInput, TParameters>;
    readonly parameters: TParameters;
    readonly checkpointInterval?: number;
    /** Owns a stable input snapshot for later correction replay. */
    readonly snapshotInput?: (value: TInput) => Readonly<TInput>;
}
/** Stateful, patch-producing runtime for one indicator definition. */
export declare class IndicatorRuntime<TInput, TParameters extends IndicatorParameters> {
    readonly options: IndicatorRuntimeOptions<TInput, TParameters>;
    private readonly processor;
    private readonly outputsValue;
    private readonly checkpointInterval;
    private readonly snapshotInput;
    private readonly outputOrder;
    private readonly inputsValue;
    private readonly results;
    private readonly contributions;
    private readonly committedOutputs;
    private readonly previewOutputs;
    private readonly previewRemovals;
    private readonly keysByTarget;
    private readonly checkpoints;
    private readonly archivedTimes;
    private basePositionValue;
    private previewInput;
    private revisionValue;
    constructor(options: IndicatorRuntimeOptions<TInput, TParameters>);
    get revision(): number;
    get outputs(): readonly IndicatorOutputDefinition[];
    get committedCount(): number;
    get retainedFrom(): number;
    get hasPreview(): boolean;
    snapshot(): IndicatorRuntimeSnapshot;
    /** Returns only input values retained for correction replay. */
    inputs(): readonly IndicatorRuntimeInput<Readonly<TInput>>[];
    points(outputId?: string): readonly IndicatorRuntimePoint[];
    /**
     * Releases committed input values, output history and replay checkpoints.
     * The processor state, absolute indexes, target times and current preview
     * remain valid. The consumer must already own all previously emitted points;
     * corrections before `retainedFrom` and a historical patch-only reset are no
     * longer possible until the runtime is seeded again with `reset()`.
     */
    compactHistory(): IndicatorRuntimeSnapshot;
    /**
     * Rebuilds the processor and returns one full output snapshot while retaining
     * only streaming state. This is the bounded-memory initialization path for a
     * consumer that immediately owns the returned points via a full `setData`.
     */
    resetStreaming(inputs?: readonly IndicatorRuntimeInput<TInput>[], preview?: IndicatorRuntimeInput<TInput>): readonly IndicatorRuntimePoint[];
    reset(inputs?: readonly IndicatorRuntimeInput<TInput>[]): IndicatorRuntimePatch;
    update(input: IndicatorRuntimeInput<TInput>, isFinal?: boolean): IndicatorRuntimePatch;
    /**
     * Removes the current non-final input and restores the committed output
     * visible underneath it. This is the inverse of update(input, false) and
     * is intentionally patch-producing so a streaming renderer can rewind a
     * derived tail without rebuilding the complete indicator history.
     */
    discardPreview(): IndicatorRuntimePatch;
    /**
     * Removes exactly one retained committed input and restores processor state
     * from its nearest checkpoint. Call discardPreview() first when a preview is
     * installed. Compacted inputs deliberately cannot be reopened: consumers
     * that need a rewindable tail must retain that tail instead of compacting it.
     */
    truncateTail(): IndicatorRuntimePatch;
    correct(index: number, input: IndicatorRuntimeInput<TInput>): IndicatorRuntimePatch;
    private correctNormalized;
    private reopenLast;
    private processTail;
    private commitInput;
    private installPreview;
    private setPreview;
    private clearPreview;
    private replayFrom;
    private removeResultsFrom;
    private applyCommittedResult;
    private applyStreamingResult;
    private storedOutput;
    private rememberKey;
    private forgetKey;
    private keysAtTarget;
    private maybeCheckpoint;
    private runtimeCheckpoint;
    private normalizeInput;
    private assertIncreasing;
    private validateProcessor;
    private normalizeResult;
    private captureState;
    private restoreState;
    private restoreMap;
    private clearState;
    private capture;
    private captureAll;
    private materialize;
    private materializeStored;
    private timeAt;
    private inputAt;
    private currentPoints;
    private diff;
    private patch;
}

// Public API module: indicator-source.d.ts
export declare const IndicatorSourceKind: Readonly<{
    readonly Candles: 'candles';
    readonly CandleField: 'candle-field';
    readonly IndicatorOutput: 'indicator-output';
}>;
export type IndicatorSourceKind = typeof IndicatorSourceKind[keyof typeof IndicatorSourceKind];
export declare const IndicatorCandleField: Readonly<{
    readonly Open: 'open';
    readonly High: 'high';
    readonly Low: 'low';
    readonly Close: 'close';
    readonly Median: 'hl2';
    readonly Typical: 'hlc3';
    readonly Average: 'ohlc4';
    readonly Volume: 'volume';
}>;
export type IndicatorCandleField = typeof IndicatorCandleField[keyof typeof IndicatorCandleField];
export interface IndicatorCandlesSource {
    /** Full OHLCV candle input; scalar definitions receive its close field. */
    readonly kind: typeof IndicatorSourceKind.Candles;
}
export interface IndicatorCandleFieldSource {
    /** The selected scalar is lifted to O=H=L=C for candlestick-input definitions. */
    readonly kind: typeof IndicatorSourceKind.CandleField;
    readonly field: IndicatorCandleField;
}
/**
 * Uses finite samples from one output on their rendered timestamps. Missing
 * sparse samples are skipped. `indicatorId` is the stable persistence id.
 */
export interface IndicatorOutputSource {
    readonly kind: typeof IndicatorSourceKind.IndicatorOutput;
    readonly indicatorId: string;
    readonly outputId: string;
}
export type IndicatorSource = IndicatorCandlesSource | IndicatorCandleFieldSource | IndicatorOutputSource;
export declare const IndicatorSourceStatusReason: Readonly<{
    readonly Ready: 'ready';
    readonly MissingIndicator: 'missing-indicator';
    readonly MissingOutput: 'missing-output';
    readonly UpstreamUnavailable: 'upstream-unavailable';
    readonly Error: 'error';
}>;
export type IndicatorSourceStatusReason = typeof IndicatorSourceStatusReason[keyof typeof IndicatorSourceStatusReason];
export interface IndicatorSourceStatus {
    readonly source: IndicatorSource;
    readonly available: boolean;
    readonly reason: IndicatorSourceStatusReason;
}
export declare const DefaultIndicatorSource: IndicatorCandlesSource;
/** Validates, clones and freezes an editor/persistence supplied source binding. */
export declare function normalizeIndicatorSource(value: unknown): IndicatorSource;
export declare function indicatorSourcesEqual(left: IndicatorSource, right: IndicatorSource): boolean;

// Public API module: indicator-taxonomy.d.ts
import { type IndicatorCategory as IndicatorCategoryValue } from './indicator-definition.js';
export interface IndicatorTaxonomyEntry {
    readonly category: IndicatorCategoryValue;
    readonly label: string;
    readonly order: number;
}
/** Canonical trading-oriented category order and labels shared by catalog and UI. */
export declare const IndicatorTaxonomy: readonly IndicatorTaxonomyEntry[];
export declare function indicatorTaxonomyEntry(category: IndicatorCategoryValue): IndicatorTaxonomyEntry;
export declare function indicatorCategoryLabel(category: IndicatorCategoryValue): string;

// Public API module: math/efficiency-ratio.d.ts
import { type RingBufferCheckpoint } from './ring-buffer.js';
type NumericValue = number | null | undefined;
export type RollingEfficiencyRatioCheckpoint = RingBufferCheckpoint<number | null>;
/** Kaufman efficiency ratio over a fixed sample window with O(1) updates. */
export declare class RollingEfficiencyRatio {
    readonly windowLength: number;
    private readonly values;
    private volatility;
    private invalid;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingEfficiencyRatioCheckpoint;
    restore(checkpoint: RollingEfficiencyRatioCheckpoint): void;
}
export {};

// Public API module: math/index.d.ts
export * from './ring-buffer.js';
export * from './rolling-window.js';
export * from './moving-averages.js';
export * from './true-range.js';
export * from './efficiency-ratio.js';
export * from './relative-strength.js';
export * from './linear-regression.js';
export * from './lunar-phase.js';

// Public API module: math/linear-regression.d.ts
import { type RingBufferCheckpoint } from './ring-buffer.js';
type NumericValue = number | null | undefined;
export type RollingLinearRegressionCheckpoint = RingBufferCheckpoint<number | null>;
/** Least-squares endpoint, forecast, slope and standard error, updated in O(1). */
export declare class RollingLinearRegression {
    readonly windowLength: number;
    private readonly values;
    private readonly sumX;
    private readonly divisor;
    private invalid;
    private reference;
    private centeredSum;
    private centeredSum2;
    private centeredSumXy;
    private validSumX;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    get nextValue(): number | null;
    get slopeValue(): number | null;
    get standardErrorValue(): number | null;
    get rSquaredValue(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    previewNext(value: NumericValue): number | null;
    previewSlope(value: NumericValue): number | null;
    previewStandardError(value: NumericValue): number | null;
    previewRSquared(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingLinearRegressionCheckpoint;
    restore(checkpoint: RollingLinearRegressionCheckpoint): void;
    private project;
    private endpoint;
    private next;
    private slope;
    private standardError;
    private rSquared;
}
export {};

// Public API module: math/lunar-phase.d.ts
/**
 * Mirrors Ecng.Common.TimeHelper.GetLunarPhase and returns its phase index 0..7.
 */
export declare function lunarPhaseFromMilliseconds(timestamp: number): number | null;

// Public API module: math/moving-averages.d.ts
import { type RingBufferCheckpoint } from './ring-buffer.js';
import { type RollingWindowCheckpoint } from './rolling-window.js';
type NumericValue = number | null | undefined;
export declare class SimpleMovingAverage {
    readonly windowLength: number;
    private readonly sum;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
/**
 * StockSharp SMA value semantics: finite samples fill a bounded window, while
 * the partial sum is divided by the full configured length from the first sample.
 * Invalid samples emit null and do not advance the window.
 */
export declare class PartialSeedSimpleMovingAverage {
    readonly windowLength: number;
    private readonly buffer;
    private sum;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RingBufferCheckpoint<number>;
    restore(checkpoint: RingBufferCheckpoint<number>): void;
}
export interface PartialSeedExponentialMovingAverageCheckpoint {
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}
/** StockSharp EMA values, including partial `seedSum / length` warm-up output. */
export declare class PartialSeedExponentialMovingAverage {
    readonly windowLength: number;
    private readonly seed;
    private seedSum;
    private previous;
    private readonly multiplier;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): PartialSeedExponentialMovingAverageCheckpoint;
    restore(state: PartialSeedExponentialMovingAverageCheckpoint): void;
    /** StockSharp's `Buffer.SumNoFirst`: zero for an empty window, the oldest dropped otherwise. */
    private seedNoOldest;
}
/** Linear WMA with weights 1..length from oldest to newest in O(1). */
export declare class LinearWeightedMovingAverage {
    readonly windowLength: number;
    private readonly buffer;
    private sum;
    private weightedSum;
    private invalid;
    private readonly divisor;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
/** Fixed newest-to-oldest weights over a bounded window with isolated previews. */
export declare class FixedWeightedMovingAverage {
    private readonly buffer;
    readonly weights: readonly number[];
    private readonly divisor;
    constructor(weights: readonly number[]);
    get windowLength(): number;
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
export interface SmoothedMovingAverageCheckpoint {
    readonly seed: RingBufferCheckpoint<number>;
    readonly previous: number;
}
/**
 * StockSharp SMMA: partial seed sum divided by the full length, followed by
 * Wilder recursion. Invalid samples return null without advancing state.
 */
export declare class SmoothedMovingAverage {
    readonly windowLength: number;
    private readonly seed;
    private seedSum;
    private previous;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): SmoothedMovingAverageCheckpoint;
    restore(checkpoint: SmoothedMovingAverageCheckpoint): void;
    /** StockSharp's `Buffer.SumNoFirst`: zero for an empty window, the oldest dropped otherwise. */
    private seedNoOldest;
}
export interface ExpandingWilderMovingAverageCheckpoint {
    readonly count: number;
    readonly previous: number;
}
/** Wilder average with a growing warm-up divisor capped at the configured length. */
export declare class ExpandingWilderMovingAverage {
    readonly windowLength: number;
    private count;
    private previous;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): ExpandingWilderMovingAverageCheckpoint;
    restore(checkpoint: ExpandingWilderMovingAverageCheckpoint): void;
    private evaluate;
}
export interface SeededMovingAverageCheckpoint {
    readonly count: number;
    readonly seedSum: number;
    readonly seedValid: boolean;
    readonly formed: boolean;
    readonly previous: number;
    readonly poisoned: boolean;
}
declare abstract class SeededMovingAverage {
    readonly windowLength: number;
    private readonly poisonAfterGap;
    private readonly emitPartialSeed;
    private count;
    private seedSum;
    private seedValid;
    private formed;
    private previous;
    private poisoned;
    constructor(windowLength: number, poisonAfterGap: boolean, emitPartialSeed: boolean);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): SeededMovingAverageCheckpoint;
    restore(checkpoint: SeededMovingAverageCheckpoint): void;
    protected abstract next(previous: number, value: number): number;
    private evaluate;
}
export declare class ExponentialMovingAverage extends SeededMovingAverage {
    private readonly multiplier;
    constructor(windowLength: number);
    protected next(previous: number, value: number): number;
}
export declare class WilderMovingAverage extends SeededMovingAverage {
    constructor(windowLength: number);
    protected next(previous: number, value: number): number;
}
export {};

// Public API module: math/relative-strength.d.ts
import { type SmoothedMovingAverageCheckpoint } from './moving-averages.js';
export interface PartialRelativeStrengthIndexCheckpoint {
    readonly initialized: boolean;
    readonly previous: number | null;
    readonly previousResult: number | null;
    readonly gain: SmoothedMovingAverageCheckpoint;
    readonly loss: SmoothedMovingAverageCheckpoint;
}
/**
 * StockSharp RSI value stream, including partial SMMA values during warm-up.
 * The first finite input seeds the prior value and emits null; later finite
 * deltas emit RSI immediately, while `isFormed` tracks the full SMMA length.
 */
export declare class PartialRelativeStrengthIndex {
    readonly length: number;
    private initialized;
    private previous;
    private previousResult;
    private readonly gain;
    private readonly loss;
    constructor(length: number);
    get isFormed(): boolean;
    push(value: number | null | undefined): number | null;
    preview(value: number | null | undefined): number | null;
    reset(): void;
    checkpoint(): PartialRelativeStrengthIndexCheckpoint;
    restore(state: PartialRelativeStrengthIndexCheckpoint): void;
    private evaluate;
}

// Public API module: math/ring-buffer.d.ts
export interface RingBufferCheckpoint<T> {
    readonly values: readonly T[];
}
/** Fixed-capacity FIFO with O(1) append/eviction and stable logical indexing. */
export declare class RingBuffer<T> {
    readonly capacity: number;
    private values;
    private head;
    private sizeValue;
    constructor(capacity: number);
    get size(): number;
    get full(): boolean;
    at(index: number): T | undefined;
    front(): T | undefined;
    back(): T | undefined;
    push(value: T): void;
    clear(): void;
    toArray(): T[];
    checkpoint(): RingBufferCheckpoint<T>;
    restore(checkpoint: RingBufferCheckpoint<T>): void;
}

// Public API module: math/rolling-window.d.ts
import { type RingBufferCheckpoint } from './ring-buffer.js';
type NumericValue = number | null | undefined;
export interface RollingWindowCheckpoint extends RingBufferCheckpoint<number | null> {
    /** Exact accumulator state, present for rolling sums and their SMA wrappers. */
    readonly sum?: number;
    readonly invalid?: number;
    /** Exact online state, present for rolling variance/deviation wrappers. */
    readonly variance?: Readonly<VarianceState>;
}
/** Finite-only rolling sum; output is null until the complete window is valid. */
export declare class RollingSum {
    readonly windowLength: number;
    private readonly buffer;
    private sum;
    private invalid;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    get partialValue(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    previewPartial(value: NumericValue): number | null;
    /**
     * StockSharp's `Buffer.SumNoFirst + value`: the oldest sample leaves the sum as soon as the
     * window holds one, rather than waiting for it to fill the way a commit's eviction does.
     */
    previewWithoutOldest(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
    private add;
    private remove;
    private recalculateSum;
    private previewSum;
}
export declare class RollingMinimum {
    readonly windowLength: number;
    private readonly extrema;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    get partialValue(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    previewPartial(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
export declare class RollingMaximum {
    readonly windowLength: number;
    private readonly extrema;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    get partialValue(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    previewPartial(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
interface VarianceState {
    count: number;
    mean: number;
    m2: number;
}
export declare class RollingVariance {
    readonly windowLength: number;
    readonly sample: boolean;
    private readonly buffer;
    private readonly state;
    constructor(windowLength: number, sample?: boolean);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
    private normalized;
    private recalculateState;
    private previewState;
    private stateOf;
}
export declare class RollingStandardDeviation {
    readonly windowLength: number;
    readonly sample: boolean;
    private readonly variance;
    constructor(windowLength: number, sample?: boolean);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
}
/** Mean absolute deviation from the mean of a complete finite rolling window. */
export declare class RollingMeanDeviation {
    readonly windowLength: number;
    private readonly buffer;
    private sum;
    private invalid;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
    private deviation;
    private add;
    private remove;
}
/** Median of a complete finite rolling window, backed by FIFO and sorted views. */
export declare class RollingMedian {
    readonly windowLength: number;
    private readonly buffer;
    private sorted;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(value: NumericValue): number | null;
    preview(value: NumericValue): number | null;
    reset(): void;
    checkpoint(): RollingWindowCheckpoint;
    restore(checkpoint: RollingWindowCheckpoint): void;
    private lowerBound;
    private insert;
    private remove;
    private median;
}
export {};

// Public API module: math/true-range.d.ts
import type { IndicatorCandle } from '../indicator-definition.js';
import { type ExpandingWilderMovingAverageCheckpoint, type SeededMovingAverageCheckpoint } from './moving-averages.js';
export interface TrueRangeCheckpoint {
    readonly hasPrevious: boolean;
    readonly previousClose: number | null;
}
export declare class TrueRange {
    private hasPrevious;
    private previousClose;
    push(candle: Readonly<IndicatorCandle>): number | null;
    preview(candle: Readonly<IndicatorCandle>): number | null;
    reset(): void;
    checkpoint(): TrueRangeCheckpoint;
    restore(checkpoint: TrueRangeCheckpoint): void;
    private calculate;
}
export interface AverageTrueRangeCheckpoint {
    readonly trueRange: TrueRangeCheckpoint;
    readonly average: SeededMovingAverageCheckpoint;
}
export declare class AverageTrueRange {
    readonly windowLength: number;
    private readonly trueRange;
    private readonly average;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(candle: Readonly<IndicatorCandle>): number | null;
    preview(candle: Readonly<IndicatorCandle>): number | null;
    reset(): void;
    checkpoint(): AverageTrueRangeCheckpoint;
    restore(checkpoint: AverageTrueRangeCheckpoint): void;
}
export interface ExpandingAverageTrueRangeCheckpoint {
    readonly previousClose: number | null;
    readonly average: ExpandingWilderMovingAverageCheckpoint;
}
/**
 * StockSharp-style ATR with a growing warm-up divisor. Invalid high/low samples
 * neither advance the average nor replace the previous valid candle close.
 */
export declare class ExpandingAverageTrueRange {
    readonly windowLength: number;
    private previousClose;
    private readonly average;
    constructor(windowLength: number);
    get isFormed(): boolean;
    get value(): number | null;
    push(candle: Readonly<IndicatorCandle>): number | null;
    preview(candle: Readonly<IndicatorCandle>): number | null;
    reset(): void;
    checkpoint(): ExpandingAverageTrueRangeCheckpoint;
    restore(checkpoint: ExpandingAverageTrueRangeCheckpoint): void;
    private trueRange;
}

// Public API module: sequential-processor.d.ts
import type { IIndicatorProcessor, IndicatorOutputMetadata, IndicatorOutputValue, IndicatorProcessInput, IndicatorProcessResult } from './indicator-definition.js';
export interface IndicatorCalculationOutputValue extends IndicatorOutputValue {
    /** Override the enclosing indicator's formation state for this output line. */
    readonly isFormed?: boolean;
}
export interface IndicatorCalculationResult {
    readonly isFormed: boolean;
    readonly values: readonly IndicatorCalculationOutputValue[];
}
export interface SequentialIndicatorCheckpoint<TState> {
    readonly version: 1;
    readonly position: number;
    readonly formed: boolean;
    /** Output-level formation latches. Missing only on checkpoints written by older builds. */
    readonly formedOutputs?: readonly string[];
    readonly state: TState;
}
/**
 * Base for processors that consume one logical input at a time. Derived classes
 * receive an explicit commit flag and must use non-mutating kernel previews when
 * it is false.
 */
export declare abstract class SequentialIndicatorProcessor<TInput, TState> implements IIndicatorProcessor<TInput> {
    private positionValue;
    private formedValue;
    private readonly formedOutputIds;
    private readonly outputIds;
    protected constructor(outputIds: readonly string[]);
    get position(): number;
    process(input: IndicatorProcessInput<TInput>): IndicatorProcessResult;
    reset(): void;
    checkpoint(): SequentialIndicatorCheckpoint<TState>;
    restore(checkpoint: SequentialIndicatorCheckpoint<TState>): void;
    protected output(outputIdValue: string, value: number | null, targetIndex?: number, metadata?: IndicatorOutputMetadata): IndicatorOutputValue;
    /**
     * Emit a line whose StockSharp inner indicator forms independently from the
     * enclosing complex indicator.
     */
    protected formedOutput(outputIdValue: string, value: number | null, isFormed: boolean, targetIndex?: number, metadata?: IndicatorOutputMetadata): IndicatorCalculationOutputValue;
    protected abstract calculate(input: IndicatorProcessInput<TInput>, commit: boolean): IndicatorCalculationResult;
    protected abstract resetState(): void;
    protected abstract captureState(): TState;
    protected abstract restoreState(state: TState): void;
    private validateInput;
    private normalizeResult;
}

// Public API module: types.d.ts
/** A bar timestamp: UNIX **seconds**, not milliseconds. */
export type Time = number;
/** One input bar. Volume is optional because most indicators never read it. */
export interface CandlestickData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
/**
 * How a line is dashed: Solid 0, Dotted 1, Dashed 2, LargeDashed 3, SparseDotted 4.
 *
 * An indicator only ever *suggests* a style through its output metadata; the numbers match the
 * chart's `LineStyle` enum so the suggestion can be used as-is. The enum object itself is not
 * re-declared here -- a package that computes numbers has no business owning a drawing constant,
 * and duplicating it would give consumers two `LineStyle` symbols to disambiguate.
 */
export type LineStyleValue = 0 | 1 | 2 | 3 | 4;
