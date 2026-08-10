// Every indicator, one file each, beside a shared/ holding what more than one of them needs:
// parameter shapes, checkpoints and processors are part of the surface, and the checks a
// parameter goes through are in shared/guards.ts -- every family used to carry its own copy of
// them, and the copies were identical.

export type {
    AdaptiveLengthParameters,
} from './shared/adaptive.js';
export type {
    BollingerBandsCheckpoint,
    CompoundLengthParameters,
    DonchianChannelsCheckpoint,
    FiniteExponentialCheckpoint,
    MacdCheckpoint,
    MacdEvaluation,
} from './shared/compound.js';
export {
    FiniteExponentialAverage,
    MacdKernel,
} from './shared/compound.js';
export type {
    LengthIndicatorParameters,
} from './shared/core.js';
export {
    HighestProcessor,
    SmoothedMovingAverageProcessor,
} from './shared/core.js';
export type {
    CycleLengthParameters,
} from './shared/cycle.js';
export type {
    MomentumLengthParameters,
    OnBalanceVolumeCheckpoint,
    PriceBufferCheckpoint,
    RelativeStrengthIndexCheckpoint,
} from './shared/momentum-volume.js';
export {
    BufferedPriceProcessor,
    OnBalanceVolumeKernel,
    RelativeStrengthIndexProcessor,
} from './shared/momentum-volume.js';
export type {
    AroonCheckpoint,
    AroonValue,
    RangeLengthParameters,
} from './shared/range.js';
export type {
    DirectionalCandleSnapshot,
    DirectionalMovementCheckpoint,
    DirectionalMovementResult,
    RecursiveLengthParameters,
} from './shared/recursive-statistical.js';
export {
    DirectionalMovementKernel,
} from './shared/recursive-statistical.js';
export type {
    AlligatorParameters,
    ZigZagCheckpoint,
    ZigZagDirection,
    ZigZagParameters,
    ZigZagSource,
} from './shared/shifted-sparse.js';
export {
    ZigZagFamilyProcessor,
} from './shared/shifted-sparse.js';

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
