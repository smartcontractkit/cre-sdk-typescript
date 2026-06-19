/**
 * Validates that a JS `number` represents a safe integer.
 *
 * The two failure modes are kept distinct so callers can tell apart
 * "not an integer at all" (e.g. `1.5`, `NaN`) from "outside Number's safe
 * integer range" (e.g. `2 ** 54`), which require different remediation.
 */
export function assertSafeIntegerNumber(value: number, label: string): void {
	if (!Number.isFinite(value) || !Number.isInteger(value)) {
		throw new Error(`${label} requires an integer number, received ${value}`)
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(
			`${label} requires a safe integer number, received ${value}. Pass a bigint or string for larger values`,
		)
	}
}
