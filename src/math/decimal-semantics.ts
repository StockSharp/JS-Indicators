// The two places where StockSharp's decimal arithmetic shows through into ours.
//
// The platform computes in decimal and this port computes in double, which the parity suite
// tolerates to 1e-9 because the two cannot agree to the last bit. That tolerance covers a value
// being slightly off. It does not cover a guard: `x != 0` is a categorical question, and the
// answer flips between the two arithmetics for inputs neither of them considers unusual.

/**
 * True when a quantity the platform would hold as exactly zero has only arithmetic noise left in
 * it here.
 *
 * StockSharp guards its divisions with `!= 0m`, and in decimal `0.7m + 0.1m - 0.8m` is exactly
 * zero, so the guard fires and the indicator draws nothing. The same sum in binary doubles is
 * -1.1e-16: the guard misses, and dividing by that residual reports a value of 1e16 out of a
 * market that never moved. Re-summing does not help, and neither does compensated summation --
 * 0.7 and 0.1 have no exact binary form to sum.
 *
 * So the question is asked against the magnitude that produced the quantity rather than against
 * zero. `scale` is that magnitude: the size of the terms, not of the result.
 *
 * The threshold sits four orders above double's own noise (~1e-16 relative) and far below
 * anything an indicator can mean by a denominator -- one smaller than 1e-12 of its own inputs
 * describes a window that is flat to twelve digits.
 */
export function isPlatformZero(value: number, scale: number): boolean {
    return Math.abs(value) <= Math.abs(scale) * 1e-12;
}

/**
 * The smallest magnitude decimal can represent. A platform value that decays below it is exactly
 * zero from then on, which a double keeps approaching for hundreds more bars -- long enough for
 * the two to disagree about whether a division is possible at all.
 */
export const PLATFORM_SMALLEST = 1e-28;

/**
 * Rounds as decimal rounds at the bottom of its range, so a decaying average reaches zero on the
 * bar the platform's does. Decimal holds no more than 28 places, so near the floor its values are
 * whole multiples of 1e-28 and the step below the last one is zero. Above that range the value
 * is returned untouched: quantising an ordinary price would introduce the very error this exists
 * to avoid.
 */
export function platformDecimal(value: number): number {
    if (Math.abs(value) >= PLATFORM_SMALLEST * 10) return value;
    return Math.round(value / PLATFORM_SMALLEST) * PLATFORM_SMALLEST;
}
