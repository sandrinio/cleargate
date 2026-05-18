import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for MultiSelect — STORY-006-07
 *
 * Scenarios:
 *   - Renders placeholder when nothing selected
 *   - Opens dropdown on trigger click; closes on Escape key
 *   - Renders options in the dropdown
 *   - Clicking an option adds it to selection (onchange called)
 *   - Clicking a selected option removes test(onchange called)
 *   - Shows count label when multiple selected
 *   - Shows single item label when one selected
 */
import { render, fireEvent } from '@testing-library/svelte';
import MultiSelect from '../../src/lib/components/MultiSelect.svelte';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


const OPTIONS = [
  { value: 'uuid-001', label: 'alice@example.com' },
  { value: 'uuid-002', label: 'bob@example.com' },
  { value: 'uuid-003', label: 'carol@example.com' },
];

describe('MultiSelect', () => {
  test('renders placeholder when nothing selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, placeholder: 'All actors' },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('All actors');
  });

  test('dropdown is not visible initially', () => {
    const { queryByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    expect(queryByTestId('multiselect-dropdown')).toBeNull();
  });

  test('opens dropdown when trigger is clicked', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByTestId('multiselect-dropdown')).toBeTruthy();
  });

  test('renders all options in the dropdown', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    for (const opt of OPTIONS) {
      expect(getByTestId(`multiselect-option-${opt.value}`)).toBeTruthy();
    }
  });

  test('clicking an option calls onchange with that value added', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: [], onchange },
    });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    await fireEvent.click(getByTestId('multiselect-option-uuid-001'));
    expect(onchange).toHaveBeenCalledOnce();
    assert.ok(String(onchange.mock.calls[0]?.arguments[0]).includes('uuid-001'));
  });

  test('clicking a selected option calls onchange with that value removed', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001'], onchange },
    });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    await fireEvent.click(getByTestId('multiselect-option-uuid-001'));
    expect(onchange).toHaveBeenCalledOnce();
    assert.ok(!String(onchange.mock.calls[0]?.arguments[0]).includes('uuid-001'));
  });

  test('shows single item label when one option is selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001'] },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('alice@example.com');
  });

  test('shows count label when multiple options are selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001', 'uuid-002'] },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('2 selected');
  });

  test('closes dropdown on Escape key', async () => {
    const { getByTestId, queryByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    // Open
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByTestId('multiselect-dropdown')).toBeTruthy();
    // Press Escape via svelte:window keydown
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByTestId('multiselect-dropdown')).toBeNull();
  });

  test('shows "No options" message when options array is empty', async () => {
    const { getByTestId, getByText } = render(MultiSelect, { props: { options: [] } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByText('No options')).toBeTruthy();
  });

  test('sets aria-expanded to true when open, false when closed', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});
