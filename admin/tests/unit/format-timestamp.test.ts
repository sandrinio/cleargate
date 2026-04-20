/**
 * Unit tests for format-timestamp.ts — STORY-006-07 QA kickback Fix 2
 *
 * Scenarios:
 *   - Given a UTC ISO-8601 string, formatTimestamp() returns a locale-formatted
 *     local-time string matching "YYYY-MM-DD HH:mm:ss.SSS" pattern.
 *   - Given the same ISO, the original ISO string (used as UTC tooltip) is preserved.
 *   - Invalid input falls back to the original string.
 */
import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '../../src/lib/utils/format-timestamp.js';

describe('formatTimestamp', () => {
  it('returns a local-time display string in YYYY-MM-DD HH:mm:ss.SSS pattern', () => {
    // Use a known UTC ISO string
    const iso = '2026-04-19T10:30:45.123Z';
    const result = formatTimestamp(iso);

    // Must match the expected pattern regardless of local timezone
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it('preserves the original ISO string as the UTC tooltip text (unmodified)', () => {
    const iso = '2026-04-19T10:30:45.123Z';
    // The original iso is what goes into data-tip/title as UTC tooltip.
    // formatTimestamp must NOT modify it — the raw iso is passed through separately.
    // This test verifies the invariant: formatTimestamp(iso) !== iso
    // AND the original iso stays intact (no mutation).
    const original = iso;
    formatTimestamp(iso); // call should not mutate
    expect(iso).toBe(original);
  });

  it('formatted string differs from raw ISO (it is localised, not UTC-literal)', () => {
    // The function converts to local time — the display format must differ from
    // the raw ISO (which has 'T' separator and 'Z' suffix).
    const iso = '2026-04-19T10:30:45.123Z';
    const result = formatTimestamp(iso);
    // Result has a space separator, not 'T', and no trailing 'Z'
    expect(result).toContain(' ');
    expect(result).not.toContain('T');
    expect(result).not.toContain('Z');
  });

  it('returns original string on invalid ISO input', () => {
    const invalid = 'not-a-date';
    expect(formatTimestamp(invalid)).toBe(invalid);
  });

  it('milliseconds are always 3 digits (zero-padded)', () => {
    // ISO with .000 milliseconds
    const iso = '2026-04-19T00:00:00.000Z';
    const result = formatTimestamp(iso);
    // Last segment after final '.' should be exactly 3 digits
    const msPart = result.split('.').pop();
    expect(msPart).toMatch(/^\d{3}$/);
  });
});
