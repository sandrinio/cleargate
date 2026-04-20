/**
 * Unit tests for url-state.ts — STORY-006-07
 *
 * Covers:
 *   - parseFilters: null when param absent, value when present
 *   - filtersToParams: omits null fields, serialises all fields
 *   - Roundtrip: serialize → parse → equals original (0 filters, all filters, cursor)
 *   - defaultFilters: 7d window, all other fields null
 *   - clamp30d: no clamp when window ≤ 30d, clamps when > 30d, returns clamped flag
 */
import { describe, it, expect } from 'vitest';
import {
  parseFilters,
  filtersToParams,
  defaultFilters,
  clamp30d,
  buildAuditQueryString,
} from '../../src/lib/utils/url-state.js';
import type { AuditFilters } from '../../src/lib/utils/url-state.js';

// ── parseFilters ──────────────────────────────────────────────────────────────

describe('parseFilters', () => {
  it('returns all-null filters when params are empty', () => {
    const result = parseFilters(new URLSearchParams(''));
    expect(result).toEqual({ from: null, to: null, user: null, tool: null, cursor: null });
  });

  it('parses all fields when all params present', () => {
    const params = new URLSearchParams({
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    });
    const result = parseFilters(params);
    expect(result).toEqual({
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    });
  });

  it('ignores unknown params', () => {
    const params = new URLSearchParams({ unknown: 'value', from: '2026-04-01T00:00:00.000Z' });
    const result = parseFilters(params);
    expect(result.from).toBe('2026-04-01T00:00:00.000Z');
    // 'unknown' key should not appear in the typed result
    const resultRecord = result as unknown as Record<string, unknown>;
    expect(resultRecord['unknown']).toBeUndefined();
  });
});

// ── filtersToParams ───────────────────────────────────────────────────────────

describe('filtersToParams', () => {
  it('omits null fields', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const params = filtersToParams(filters);
    expect(params.toString()).toBe('');
  });

  it('serialises all non-null fields', () => {
    const filters: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    };
    const params = filtersToParams(filters);
    expect(params.get('from')).toBe('2026-04-01T00:00:00.000Z');
    expect(params.get('to')).toBe('2026-04-07T23:59:59.999Z');
    expect(params.get('user')).toBe('uuid-abc');
    expect(params.get('tool')).toBe('push_item');
    expect(params.get('cursor')).toBe('eyJ0cyI6MTIzfQ');
  });
});

// ── Roundtrip ─────────────────────────────────────────────────────────────────

describe('roundtrip: filtersToParams → parseFilters', () => {
  it('zero filters roundtrip', () => {
    const original: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const result = parseFilters(filtersToParams(original));
    expect(result).toEqual(original);
  });

  it('all filters roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    };
    const result = parseFilters(filtersToParams(original));
    expect(result).toEqual(original);
  });

  it('cursor absent roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: null,
      tool: 'list_items',
      cursor: null,
    };
    const result = parseFilters(filtersToParams(original));
    expect(result).toEqual(original);
  });

  it('cursor present roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-10T00:00:00.000Z',
      to: '2026-04-17T23:59:59.999Z',
      user: 'member-uuid-999',
      tool: null,
      cursor: 'abc123==',
    };
    const result = parseFilters(filtersToParams(original));
    expect(result).toEqual(original);
  });
});

// ── defaultFilters ────────────────────────────────────────────────────────────

describe('defaultFilters', () => {
  it('returns 7-day window ending at now', () => {
    const now = new Date('2026-04-18T12:00:00.000Z');
    const result = defaultFilters(now);
    expect(result.to).toBe('2026-04-18T12:00:00.000Z');
    const fromDate = new Date(result.from!);
    const expectedFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(fromDate.getTime()).toBe(expectedFrom.getTime());
  });

  it('has null user, tool, cursor', () => {
    const result = defaultFilters();
    expect(result.user).toBeNull();
    expect(result.tool).toBeNull();
    expect(result.cursor).toBeNull();
  });
});

// ── clamp30d ──────────────────────────────────────────────────────────────────

describe('clamp30d', () => {
  it('does not clamp when window is exactly 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped } = clamp30d(filters);
    expect(clamped).toBe(false);
  });

  it('does not clamp when window is < 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped, filters: result } = clamp30d(filters);
    expect(clamped).toBe(false);
    expect(result.from).toBe(filters.from);
  });

  it('clamps from to to - 30d when window exceeds 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped, filters: result } = clamp30d(filters);
    expect(clamped).toBe(true);
    const expectedFrom = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(new Date(result.from!).getTime()).toBe(expectedFrom.getTime());
    // to unchanged
    expect(result.to).toBe(to.toISOString());
  });

  it('returns clamped: false when from or to is null', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const { clamped } = clamp30d(filters);
    expect(clamped).toBe(false);
  });

  it('does not mutate input filters', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000);
    const original: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const originalFrom = original.from;
    clamp30d(original);
    expect(original.from).toBe(originalFrom); // not mutated
  });
});

// ── buildAuditQueryString ─────────────────────────────────────────────────────

describe('buildAuditQueryString', () => {
  it('returns empty string for null-only filters', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    expect(buildAuditQueryString(filters)).toBe('');
  });

  it('returns query string prefixed with ? when filters exist', () => {
    const filters: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: null,
      user: null,
      tool: null,
      cursor: null,
    };
    const qs = buildAuditQueryString(filters);
    expect(qs.startsWith('?')).toBe(true);
    expect(qs).toContain('from=');
  });
});
