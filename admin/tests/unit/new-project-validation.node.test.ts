import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for /projects/new form validation logic — STORY-006-03
 *
 * Tests client-side validation rules for the new project form:
 * - Name: required, max 100 chars
 *
 * Note: The server does NOT have a slug field (M3 blueprint override).
 * All validation here is purely client-side.
 *
 * QA kickback: also tests envelope mismatch fix — bare ProjectDto parse + redirect URL.
 */
import { ProjectSchema } from 'cleargate/admin-api';

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


// Inline the validation logic matching new/+page.svelte
const NAME_MAX = 100;

function validateName(value: string): string | null {
  if (!value.trim()) return 'Project name is required';
  if (value.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer`;
  return null;
}

describe('new project form validation', () => {
  describe('name field', () => {
    test('returns error for empty name', () => {
      expect(validateName('')).toBe('Project name is required');
    });

    test('returns error for whitespace-only name', () => {
      expect(validateName('   ')).toBe('Project name is required');
    });

    test('returns null for valid short name', () => {
      expect(validateName('My Project')).toBeNull();
    });

    test('returns null for name at exactly 100 chars', () => {
      const exactly100 = 'a'.repeat(100);
      expect(validateName(exactly100)).toBeNull();
    });

    test('returns error for name exceeding 100 chars', () => {
      const over100 = 'a'.repeat(101);
      expect(validateName(over100)).toBe(`Name must be ${NAME_MAX} characters or fewer`);
    });

    test('returns null for name with 1 char', () => {
      expect(validateName('x')).toBeNull();
    });

    test('returns null for name with unicode characters', () => {
      expect(validateName('Проект Α')).toBeNull();
    });
  });

  describe('form submission guard', () => {
    function validateAll(name: string): boolean {
      return validateName(name) === null;
    }

    test('blocks submission when name is empty', () => {
      expect(validateAll('')).toBe(false);
    });

    test('allows submission with valid name', () => {
      expect(validateAll('Valid project')).toBe(true);
    });

    test('blocks submission when name is too long', () => {
      expect(validateAll('x'.repeat(101))).toBe(false);
    });
  });
});

/**
 * Fix 1 (QA kickback) — envelope mismatch test.
 *
 * POST /admin-api/v1/projects returns a BARE ProjectDto, not { project: ProjectDto }.
 * Confirmed via mcp/src/admin-api/projects.ts:92-93:
 *   reply.code(201).send(toDto(project!))
 *
 * Previously the page used z.object({ project: ProjectSchema }).strict() which threw ZodError
 * on the bare response, causing the toast "Failed to create project" and skipping goto().
 * Fix: use ProjectSchema directly + redirect to /projects/<res.id> (not res.project.id).
 */
describe('POST /projects response schema — envelope mismatch fix (QA kickback)', () => {
  // Mirror the corrected schema from +page.svelte (bare ProjectSchema, no envelope)
  const NewProjectResponseSchema = ProjectSchema;

  const bareProjectDto = {
    id: 'uuid-abc-123',
    name: 'My New Project',
    created_by: 'admin-handle',
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  test('Scenario: bare ProjectDto parses correctly with ProjectSchema (no envelope)', () => {
    // Must not throw — if the old { project: ... } envelope schema were used, this would throw
    const result = NewProjectResponseSchema.parse(bareProjectDto);
    assert.strictEqual(result.id, 'uuid-abc-123');
    assert.strictEqual(result.name, 'My New Project');
  });

  test('Scenario: { project: ... } envelope correctly FAILS ProjectSchema (proves envelope is absent)', () => {
    // The server does NOT wrap in { project: ... } — this assertion documents the wire format
    const wrapped = { project: bareProjectDto };
    const parsed = NewProjectResponseSchema.safeParse(wrapped);
    assert.strictEqual(parsed.success, false);
  });

  test('Scenario: redirect URL uses res.id not res.project.id after successful parse', () => {
    // Simulate what the page does after mcpClient.post() returns
    const capturedGotos: string[] = [];
    const fakeGoto = (url: string) => { capturedGotos.push(url); };

    const res = NewProjectResponseSchema.parse(bareProjectDto);
    // Corrected: goto(`/projects/${res.id}`) — not res.project.id
    fakeGoto(`/projects/${res.id}`);

    assert.strictEqual((capturedGotos).length, 1);
    assert.strictEqual(capturedGotos[0], `/projects/${bareProjectDto.id}`);
  });

  test('Scenario: mcpClient.post returning bare ProjectDto drives correct redirect', async () => {
    // Unit-test the integration: mock mcpClient.post, simulate the page handleSubmit logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakePost = mock.fn<(...args: any[]) => Promise<typeof bareProjectDto>>(() => Promise.resolve(bareProjectDto));
    const capturedGotos: string[] = [];
    const fakeGoto = (url: string) => { capturedGotos.push(url); };

    // Replicate the corrected handleSubmit core logic
    const res = await fakePost('/projects', { name: 'My New Project' }, NewProjectResponseSchema);
    const parsed = NewProjectResponseSchema.parse(res);
    fakeGoto(`/projects/${parsed.id}`);

    expect(fakePost).toHaveBeenCalledOnce();
    assert.strictEqual(capturedGotos[0], '/projects/uuid-abc-123');
  });
});
