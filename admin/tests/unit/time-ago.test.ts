/**
 * Unit tests for time-ago utility — STORY-006-03
 *
 * Tests: seconds → "just now", minutes, hours, days, > 30 days → calendar date
 * Uses fixed clock (now seam) for determinism.
 */
import { describe, it, expect } from 'vitest';
import { relative } from '../../src/lib/utils/time-ago.js';

const NOW = new Date('2026-04-20T12:00:00Z');

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe('relative time formatter', () => {
  it('returns "just now" for 0 seconds ago', () => {
    expect(relative(ago(0), NOW)).toBe('just now');
  });

  it('returns "just now" for 30 seconds ago', () => {
    expect(relative(ago(30_000), NOW)).toBe('just now');
  });

  it('returns "just now" for 59 seconds ago', () => {
    expect(relative(ago(59_000), NOW)).toBe('just now');
  });

  it('returns "1 min ago" for 60 seconds ago', () => {
    expect(relative(ago(60_000), NOW)).toBe('1 min ago');
  });

  it('returns "5 min ago" for 5 minutes ago', () => {
    expect(relative(ago(5 * 60_000), NOW)).toBe('5 min ago');
  });

  it('returns "59 min ago" for 59 minutes ago', () => {
    expect(relative(ago(59 * 60_000), NOW)).toBe('59 min ago');
  });

  it('returns "1 hour ago" for 60 minutes ago', () => {
    expect(relative(ago(60 * 60_000), NOW)).toBe('1 hour ago');
  });

  it('returns "2 hours ago" for 2 hours ago', () => {
    expect(relative(ago(2 * 60 * 60_000), NOW)).toBe('2 hours ago');
  });

  it('returns "23 hours ago" for 23 hours ago', () => {
    expect(relative(ago(23 * 60 * 60_000), NOW)).toBe('23 hours ago');
  });

  it('returns "1 day ago" for 24 hours ago', () => {
    expect(relative(ago(24 * 60 * 60_000), NOW)).toBe('1 day ago');
  });

  it('returns "3 days ago" for 3 days ago', () => {
    expect(relative(ago(3 * 24 * 60 * 60_000), NOW)).toBe('3 days ago');
  });

  it('returns "30 days ago" for exactly 30 days ago', () => {
    expect(relative(ago(30 * 24 * 60 * 60_000), NOW)).toBe('30 days ago');
  });

  it('returns calendar date for > 30 days ago', () => {
    // 31 days before 2026-04-20 is 2026-03-20
    const date = new Date('2026-03-20T12:00:00Z');
    expect(relative(date, NOW)).toBe('on 2026-03-20');
  });

  it('accepts a string date input', () => {
    expect(relative('2026-04-20T11:55:00Z', NOW)).toBe('5 min ago');
  });

  it('accepts a Date object input', () => {
    const d = new Date('2026-04-20T11:00:00Z');
    expect(relative(d, NOW)).toBe('1 hour ago');
  });
});
