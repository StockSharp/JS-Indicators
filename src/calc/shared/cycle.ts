// Shared by the cycle indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    type IndicatorParameters,
} from '../../indicator-definition.js';

export interface CycleLengthParameters extends IndicatorParameters {
    readonly length: number;
}
