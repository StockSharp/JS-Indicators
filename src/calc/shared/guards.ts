// The checks every indicator runs on the parameters it is handed: is this a number at all,
// is it a whole one, is it inside the range the indicator accepts. They used to sit in each
// family's shared module, in nine and ten identical copies.

export function finite(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function integer(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || (resolved as number) < minimum || (resolved as number) > maximum) {
        throw new RangeError(
            `sschart: indicator ${name} must be an integer from ${minimum} to ${maximum}`,
        );
    }
    return resolved as number;
}

export function number(value: unknown, fallback: number, minimum: number, maximum: number, name: string): number {
    const resolved = value ?? fallback;
    if (typeof resolved !== 'number' || !Number.isFinite(resolved)
        || resolved < minimum || resolved > maximum) {
        throw new RangeError(
            `sschart: indicator ${name} must be finite from ${minimum} to ${maximum}`,
        );
    }
    return resolved;
}

export function length(value: unknown, fallback: number): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || (resolved as number) < 1 || (resolved as number) > 500)
        throw new RangeError('sschart: indicator length must be an integer from 1 to 500');
    return resolved as number;
}
