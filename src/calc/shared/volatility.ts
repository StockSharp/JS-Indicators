// Shared by the volatility indicators: parameter shapes, checkpoints and helpers that more than one
// of them needs. Anything used by a single indicator lives in that indicator's own file.

export function period(value: unknown, fallback: number, name: string): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || (resolved as number) < 1 || (resolved as number) > 500)
        throw new RangeError(`sschart: ${name} must be an integer from 1 to 500`);
    return resolved as number;
}
