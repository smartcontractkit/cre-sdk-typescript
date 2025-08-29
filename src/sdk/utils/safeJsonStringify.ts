/**
 * Supports stringifying an object with bigints, treating bigints as strings.
 * @param obj - The object to stringify
 * @returns The stringified object
 */
export const safeJsonStringify = (obj: any): string =>
  JSON.stringify(
    obj,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
