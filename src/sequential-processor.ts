import type {
    IIndicatorProcessor,
    IndicatorOutputMetadata,
    IndicatorOutputValue,
    IndicatorProcessInput,
    IndicatorProcessResult,
} from './indicator-definition.js';
import { normalizeIndicatorOutputMetadata } from './output-metadata.js';

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

function outputId(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
        throw new TypeError(`sschart: ${name} must be a non-empty trimmed string`);
    return value;
}

/**
 * Base for processors that consume one logical input at a time. Derived classes
 * receive an explicit commit flag and must use non-mutating kernel previews when
 * it is false.
 */
export abstract class SequentialIndicatorProcessor<TInput, TState>
implements IIndicatorProcessor<TInput> {
    private positionValue = 0;
    private formedValue = false;
    private readonly formedOutputIds = new Set<string>();
    private readonly outputIds: ReadonlySet<string>;

    protected constructor(outputIds: readonly string[]) {
        if (!Array.isArray(outputIds) || outputIds.length === 0)
            throw new TypeError('sschart: sequential indicator outputs must not be empty');
        const normalized = outputIds.map((id, index) => outputId(id, `outputIds[${index}]`));
        if (new Set(normalized).size !== normalized.length)
            throw new TypeError('sschart: sequential indicator outputs contain duplicates');
        this.outputIds = new Set(normalized);
    }

    get position(): number { return this.positionValue; }

    process(input: IndicatorProcessInput<TInput>): IndicatorProcessResult {
        this.validateInput(input);
        const calculation = this.calculate(input, input.isFinal);
        const result = this.normalizeResult(calculation, input.index, input.isFinal);
        // Being formed is a latch, as it is on the platform: an indicator that has warmed up stays
        // warmed up, and a bar it cannot answer for -- a flat candle, a gap, a missing volume --
        // leaves a hole in the line rather than taking the whole line back to its warm-up.
        if (input.isFinal) this.positionValue += 1;
        return result;
    }

    reset(): void {
        this.resetState();
        this.positionValue = 0;
        this.formedValue = false;
        this.formedOutputIds.clear();
    }

    checkpoint(): SequentialIndicatorCheckpoint<TState> {
        return Object.freeze({
            version: 1 as const,
            position: this.positionValue,
            formed: this.formedValue,
            formedOutputs: Object.freeze([...this.formedOutputIds]),
            state: this.captureState(),
        });
    }

    restore(checkpoint: SequentialIndicatorCheckpoint<TState>): void {
        if (checkpoint === null || typeof checkpoint !== 'object'
            || checkpoint.version !== 1
            || !Number.isInteger(checkpoint.position) || checkpoint.position < 0) {
            throw new TypeError('sschart: invalid sequential indicator checkpoint');
        }
        const previousPosition = this.positionValue;
        const previousFormed = this.formedValue;
        const previousFormedOutputs = [...this.formedOutputIds];
        const previousState = this.captureState();
        try {
            if ((checkpoint.formed !== undefined && typeof checkpoint.formed !== 'boolean')
                || (checkpoint.formedOutputs !== undefined
                    && (!Array.isArray(checkpoint.formedOutputs)
                        || checkpoint.formedOutputs.some((id) => (
                            typeof id !== 'string' || !this.outputIds.has(id)
                        ))
                        || new Set(checkpoint.formedOutputs).size !== checkpoint.formedOutputs.length))) {
                throw new TypeError('sschart: invalid sequential indicator checkpoint formation');
            }
            this.restoreState(checkpoint.state);
            this.positionValue = checkpoint.position;
            this.formedValue = checkpoint.formed === true;
            this.formedOutputIds.clear();
            const formedOutputs = checkpoint.formedOutputs
                ?? (checkpoint.formed ? [...this.outputIds] : []);
            for (const id of formedOutputs) this.formedOutputIds.add(id);
        } catch (error) {
            try { this.restoreState(previousState); } catch { /* preserve the original failure */ }
            this.positionValue = previousPosition;
            this.formedValue = previousFormed;
            this.formedOutputIds.clear();
            for (const id of previousFormedOutputs) this.formedOutputIds.add(id);
            throw error;
        }
    }

    protected output(
        outputIdValue: string,
        value: number | null,
        targetIndex = this.positionValue,
        metadata?: IndicatorOutputMetadata,
    ): IndicatorOutputValue {
        return metadata === undefined
            ? { outputId: outputIdValue, value, targetIndex }
            : { outputId: outputIdValue, value, targetIndex, metadata };
    }

    /**
     * Emit a line whose StockSharp inner indicator forms independently from the
     * enclosing complex indicator.
     */
    protected formedOutput(
        outputIdValue: string,
        value: number | null,
        isFormed: boolean,
        targetIndex = this.positionValue,
        metadata?: IndicatorOutputMetadata,
    ): IndicatorCalculationOutputValue {
        return metadata === undefined
            ? { outputId: outputIdValue, value, targetIndex, isFormed }
            : { outputId: outputIdValue, value, targetIndex, metadata, isFormed };
    }

    protected abstract calculate(
        input: IndicatorProcessInput<TInput>,
        commit: boolean,
    ): IndicatorCalculationResult;
    protected abstract resetState(): void;
    protected abstract captureState(): TState;
    protected abstract restoreState(state: TState): void;

    private validateInput(input: IndicatorProcessInput<TInput>): void {
        if (input === null || typeof input !== 'object')
            throw new TypeError('sschart: indicator process input must be an object');
        if (!Number.isInteger(input.index) || input.index < 0)
            throw new RangeError('sschart: indicator process index must be a non-negative integer');
        if (input.index !== this.positionValue) {
            throw new RangeError(
                `sschart: indicator expected input index ${this.positionValue}, received ${input.index}`,
            );
        }
        if (typeof input.time !== 'number' || !Number.isFinite(input.time))
            throw new TypeError('sschart: indicator process time must be finite');
        if (typeof input.isFinal !== 'boolean')
            throw new TypeError('sschart: indicator process isFinal must be boolean');
    }

    private normalizeResult(
        value: IndicatorCalculationResult,
        sourceIndex: number,
        commit: boolean,
    ): IndicatorProcessResult {
        if (value === null || typeof value !== 'object')
            throw new TypeError('sschart: indicator processor returned an invalid result');
        if (typeof value.isFormed !== 'boolean')
            throw new TypeError('sschart: indicator result isFormed must be boolean');
        if (!Array.isArray(value.values))
            throw new TypeError('sschart: indicator result values must be an array');

        const values: IndicatorOutputValue[] = [];
        value.values.forEach((item, index) => {
            if (item === null || typeof item !== 'object')
                throw new TypeError(`sschart: indicator result values[${index}] must be an object`);
            const id = outputId(item.outputId, `result values[${index}].outputId`);
            if (!this.outputIds.has(id))
                throw new RangeError(`sschart: indicator result references unknown output '${id}'`);
            if (item.value !== null
                && (typeof item.value !== 'number' || !Number.isFinite(item.value))) {
                throw new TypeError(`sschart: indicator result '${id}' must be finite or null`);
            }
            if (!Number.isInteger(item.targetIndex) || item.targetIndex < 0)
                throw new RangeError(`sschart: indicator result '${id}' targetIndex must be non-negative`);
            if (item.isFormed !== undefined && typeof item.isFormed !== 'boolean')
                throw new TypeError(`sschart: indicator result '${id}' isFormed must be boolean`);
            if (values.some((existing) => (
                existing.outputId === id && existing.targetIndex === item.targetIndex
            ))) {
                throw new TypeError(`sschart: duplicate indicator result '${id}' at ${item.targetIndex}`);
            }
            const metadata = normalizeIndicatorOutputMetadata(
                item.metadata,
                `indicator result '${id}' metadata`,
            );
            const formsNow = item.isFormed ?? value.isFormed;
            // A preview can never be the bar an indicator forms on. StockSharp pushes into a buffer
            // only on a final input, so the bar being previewed is in no window and cannot be the
            // sample that completes one -- whether the platform expresses that as `Buffer.Count >=
            // Length` or as an `IsFormed = true` sitting inside `if (input.IsFinal)`. Answering
            // otherwise draws the first point of a line one bar early.
            const isFormed = this.formedOutputIds.has(id) || (commit && formsNow);
            if (commit && formsNow) this.formedOutputIds.add(id);
            values.push(Object.freeze({
                outputId: id,
                value: isFormed ? item.value : null,
                targetIndex: item.targetIndex,
                ...(metadata === undefined ? {} : { metadata }),
            }));
        });
        if (commit && value.isFormed) this.formedValue = true;
        return Object.freeze({
            sourceIndex,
            isFormed: this.formedValue,
            values: Object.freeze(values),
        });
    }
}
