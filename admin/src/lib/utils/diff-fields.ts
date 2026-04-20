/**
 * diff-fields.ts — shallow field-diff helper — STORY-006-06
 *
 * Compares two plain objects at top-level keys.
 * Returns the list of key NAMES (never values) that differ.
 * Handles: missing keys (added/removed), null vs undefined, array length.
 *
 * Pure function — no side effects, no imports.
 */

/**
 * Return top-level key names whose JSON-stringified values differ
 * between object `a` and object `b`.
 *
 * Keys present in `a` but not in `b` are treated as changed (removed).
 * Keys present in `b` but not in `a` are treated as changed (added).
 * Values are compared via JSON.stringify — NaN → "null", undefined → omitted key.
 *
 * @param a - previous version payload
 * @param b - current version payload
 * @returns sorted array of changed key names
 */
export function diffFields(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): string[] {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];

  for (const key of allKeys) {
    const aVal = a[key];
    const bVal = b[key];

    // Treat undefined and absent the same way — JSON.stringify omits undefined
    // but we want to detect key presence changes.
    const aPresent = Object.prototype.hasOwnProperty.call(a, key);
    const bPresent = Object.prototype.hasOwnProperty.call(b, key);

    if (aPresent !== bPresent) {
      // Key added or removed
      changed.push(key);
      continue;
    }

    // Both present — compare by JSON.stringify (handles null, arrays, nested objs)
    if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      changed.push(key);
    }
  }

  return changed.sort();
}
