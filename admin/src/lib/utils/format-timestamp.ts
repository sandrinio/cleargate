/**
 * format-timestamp.ts — STORY-006-07
 *
 * Extracted from +page.svelte so it can be unit-tested independently.
 *
 * formatTimestamp(iso) → local-time display string "YYYY-MM-DD HH:mm:ss.SSS"
 * The original ISO string should be preserved separately as the UTC tooltip text.
 */

/**
 * Format an ISO-8601 UTC timestamp for local display.
 * Returns "YYYY-MM-DD HH:mm:ss.SSS" in the browser's local timezone.
 * Falls back to the original string on parse error.
 */
export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);
    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${ms}`;
  } catch {
    return iso;
  }
}
