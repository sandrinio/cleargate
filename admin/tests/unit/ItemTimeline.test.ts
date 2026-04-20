/**
 * Unit tests for ItemTimeline component — STORY-006-06
 *
 * Scenarios:
 *   - Renders entries in descending version order (newest first)
 *   - Single version shows "Only one version exists"
 *   - Empty versions shows fallback text
 *   - Shows pruning meta line when totalPushed > versions.length
 *   - Entry header contains version number, author, time-ago
 *   - Keyboard Enter toggles expand (via keydown)
 *   - Clicking header toggles expand
 *   - Diff summary shown in collapsed header
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ItemTimeline from '../../src/lib/components/ItemTimeline.svelte';

const NOW = new Date('2026-04-19T12:00:00.000Z');

function makeVersion(v: number, overrides: Record<string, unknown> = {}) {
  return {
    version: v,
    pushed_by_member_id: `member-uuid-${v}-abcd`,
    pushed_at: new Date(NOW.getTime() - v * 60 * 60 * 1000).toISOString(),
    status: 'synced',
    diff_summary: v > 1 ? `changed: status` : null,
    ...overrides,
  };
}

describe('ItemTimeline', () => {
  it('shows "Only one version exists" for a single version', () => {
    const { getByTestId } = render(ItemTimeline, {
      props: { versions: [makeVersion(1)] },
    });
    expect(getByTestId('single-version-msg').textContent).toContain('Only one version exists');
  });

  it('shows empty fallback when no versions', () => {
    const { getByTestId } = render(ItemTimeline, {
      props: { versions: [] },
    });
    expect(getByTestId('empty-timeline')).toBeTruthy();
  });

  it('renders entries in descending version order (newest first)', () => {
    const versions = [makeVersion(1), makeVersion(3), makeVersion(2)];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const entries = getAllByTestId('timeline-entry');
    // First entry should be v3, last v1
    expect(entries[0].getAttribute('data-version')).toBe('3');
    expect(entries[2].getAttribute('data-version')).toBe('1');
  });

  it('shows pruning meta line when totalPushed > versions.length', () => {
    const versions = Array.from({ length: 10 }, (_, i) => makeVersion(i + 1));
    const { getByTestId } = render(ItemTimeline, {
      props: { versions, totalPushed: 15 },
    });
    const meta = getByTestId('pruning-meta');
    expect(meta.textContent).toContain('Showing last 10 versions');
  });

  it('does NOT show pruning meta when totalPushed equals versions.length', () => {
    const versions = Array.from({ length: 7 }, (_, i) => makeVersion(i + 1));
    const { queryByTestId } = render(ItemTimeline, {
      props: { versions, totalPushed: 7 },
    });
    expect(queryByTestId('pruning-meta')).toBeNull();
  });

  it('entry header contains version number label', () => {
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions: [makeVersion(1), makeVersion(2)] },
    });
    const labels = getAllByTestId('entry-label');
    // Newest (v2) should be first
    expect(labels[0].textContent).toContain('v2');
    expect(labels[1].textContent).toContain('v1');
  });

  it('clicking entry header toggles expanded state', async () => {
    const versions = [makeVersion(1), makeVersion(2)];
    const { getAllByTestId, queryByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const headers = getAllByTestId('timeline-entry-header');
    // Initially not expanded
    expect(queryByTestId('expanded-payload')).toBeNull();
    // Click — but since payload is undefined in this test, expanded-payload won't appear
    // Just verify aria-expanded changes
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(headers[0]);
    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('keyboard Enter toggles expand on header', async () => {
    const versions = [makeVersion(1), makeVersion(2)];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const headers = getAllByTestId('timeline-entry-header');
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    await fireEvent.keyDown(headers[0], { key: 'Enter' });
    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
    await fireEvent.keyDown(headers[0], { key: 'Enter' });
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('shows server-provided diff_summary in header', () => {
    const versions = [
      makeVersion(1, { diff_summary: null }),
      makeVersion(2, { diff_summary: 'changed: status, assignee' }),
    ];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const summaries = getAllByTestId('diff-summary');
    // The newest (v2) has diff summary
    expect(summaries[0].textContent).toContain('changed: status, assignee');
  });
});
