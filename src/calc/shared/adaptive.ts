// Shared by the adaptive indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

import {
    type IndicatorParameters,
} from '../../indicator-definition.js';

export function parameter(
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    name: string,
): number {
    const resolved = value ?? fallback;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved)
        || resolved < minimum || resolved > maximum) {
        throw new RangeError(
            `sschart: indicator ${name} must be finite from ${minimum} to ${maximum}`,
        );
    }
    return resolved;
}

export interface AdaptiveLengthParameters extends IndicatorParameters {
    readonly length: number;
}
