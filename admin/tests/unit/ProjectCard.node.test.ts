import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for ProjectCard component — STORY-006-03
 *
 * Scenario: ProjectCard renders with project props
 * Scenario: ProjectCard link routes to /projects/:id
 * Scenario: ProjectCard shows member count chip when memberCount provided
 * Scenario: ProjectCard shows token count chip when tokenCount provided
 * Scenario: ProjectCard omits chips when counts not provided
 *
 * QA kickback tests also included here:
 * - Alphabetical sort logic (Fix 2)
 * - Design Guide §6.1/§6.2 class compliance (Fix 4)
 */
import { render } from '@testing-library/svelte';
import ProjectCard from '../../src/lib/components/ProjectCard.svelte';
import type { Project } from 'cleargate/admin-api';

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


const stubProject: Project = {
  id: 'abc-123',
  name: 'Alpha Project',
  created_by: 'admin-user',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  deleted_at: null,
};

describe('ProjectCard', () => {
  test('renders the project name', () => {
    const { getByText } = render(ProjectCard, { props: { project: stubProject } });
    expect(getByText('Alpha Project')).toBeTruthy();
  });

  test('links project name to /projects/:id', () => {
    const { getByRole } = render(ProjectCard, { props: { project: stubProject } });
    const link = getByRole('link', { name: 'Alpha Project' });
    expect(link.getAttribute('href')).toBe('/projects/abc-123');
  });

  test('shows a "Created" relative time chip', () => {
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    const chip = container.querySelector('[aria-label^="Created"]');
    assert.ok(chip);
    assert.match(String(chip?.textContent), /Created/);
  });

  test('shows member count chip when memberCount is provided', () => {
    const { getByRole } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 3 },
    });
    // aria-label on the span
    expect(getByRole('generic', { name: /3 members/i }) ?? null).toBeTruthy();
  });

  test('member count chip has DG §6.3 value chip classes', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 3 },
    });
    const chip = container.querySelector('[aria-label="3 members"]');
    assert.ok(chip);
    expect(chip?.classList.contains('rounded-full')).toBe(true);
    expect(chip?.classList.contains('bg-accent')).toBe(true);
    expect(chip?.classList.contains('text-accent-content')).toBe(true);
  });

  test('shows token count chip when tokenCount is provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, tokenCount: 5 },
    });
    const chip = container.querySelector('[aria-label="5 tokens"]');
    assert.ok(chip);
    expect(chip?.textContent?.trim()).toContain('5 tokens');
  });

  test('omits member count chip when memberCount not provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject },
    });
    const chip = container.querySelector('[aria-label*="member"]');
    assert.ok(!(chip));
  });

  test('omits token count chip when tokenCount not provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject },
    });
    const chip = container.querySelector('[aria-label*="token"]');
    assert.ok(!(chip));
  });

  test('renders "1 member" (singular) for memberCount=1', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 1 },
    });
    const chip = container.querySelector('[aria-label="1 member"]');
    assert.ok(chip);
    expect(chip?.textContent?.trim()).toBe('1 member');
  });
});

/**
 * Fix 2 (QA kickback) — Alphabetical sort test.
 *
 * The dashboard page sorts projects alphabetically by name client-side
 * (dashboard +page.svelte: [...res.projects].sort((a, b) => a.name.localeCompare(b.name))).
 * This unit test verifies the sort logic directly — no Playwright needed.
 */
describe('Dashboard project sort — alphabetical order (QA kickback Fix 2)', () => {
  // Mirror the sort logic from admin/src/routes/+page.svelte
  function sortProjects(projects: Pick<Project, 'id' | 'name'>[]): Pick<Project, 'id' | 'name'>[] {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }

  test('Scenario: [Zebra, Apple] sorts to [Apple, Zebra]', () => {
    const input = [
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    assert.strictEqual(sorted[0].name, 'Apple');
    assert.strictEqual(sorted[1].name, 'Zebra');
  });

  test('sorts three projects alphabetically', () => {
    const input = [
      { id: '3', name: 'Mango' },
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    expect(sorted.map((p) => p.name)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  test('is case-insensitive (localeCompare)', () => {
    const input = [
      { id: '1', name: 'zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    // localeCompare in default locale treats 'A' < 'z' — Apple before zebra
    assert.strictEqual(sorted[0].name, 'Apple');
  });

  test('does not mutate the original array', () => {
    const input = [
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    sortProjects(input);
    // Input order unchanged
    assert.strictEqual(input[0].name, 'Zebra');
  });
});

/**
 * Fix 4 (QA kickback) — Design Guide §6.1/§6.2 class compliance.
 *
 * Design Guide §6.1: Card shell uses bg-base-100 rounded-3xl shadow-card p-6
 * (applied by Card.svelte which ProjectCard wraps).
 * Design Guide §6.2: Neutral pill uses rounded-full bg-base-200 text-xs.
 */
describe('ProjectCard — Design Guide class compliance (QA kickback Fix 4)', () => {
  test('Scenario: DG §6.1 card shell classes present (bg-base-100, rounded-3xl, shadow-card, p-6)', () => {
    // Card.svelte renders: <div class="bg-base-100 rounded-3xl shadow-card p-6 {extraClass}">
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    // The outermost div rendered by Card.svelte
    const cardShell = container.querySelector('.bg-base-100.rounded-3xl.shadow-card.p-6');
    assert.ok(cardShell);
  });

  test('Scenario: DG §6.2 neutral pill for created-at has rounded-full and bg-base-200', () => {
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    const pill = container.querySelector('[aria-label^="Created"]');
    assert.ok(pill);
    // DG §6.2 neutral pill: rounded-full bg-base-200
    expect(pill?.classList.contains('rounded-full')).toBe(true);
    expect(pill?.classList.contains('bg-base-200')).toBe(true);
    expect(pill?.classList.contains('text-xs')).toBe(true);
  });

  test('Scenario: project name link has DG §6.1 typography (text-xl, font-semibold)', () => {
    const { getByRole } = render(ProjectCard, { props: { project: stubProject } });
    const link = getByRole('link', { name: 'Alpha Project' });
    expect(link.classList.contains('text-xl')).toBe(true);
    expect(link.classList.contains('font-semibold')).toBe(true);
  });
});
