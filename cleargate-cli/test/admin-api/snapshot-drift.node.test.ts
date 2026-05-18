import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * S-1: Snapshot drift detector.
 *
 * Reads mcp/src/admin-api/__snapshots__/openapi.test.ts.snap at runtime and
 * asserts that each vendored Zod schema's key set exactly matches the
 * `required` arrays from the OpenAPI snapshot for the corresponding schema.
 *
 * This test fails loudly when the server's OpenAPI spec gains or loses
 * fields, prompting a CLI schema update.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ProjectSchema,
  MemberSchema,
  InviteCreatedSchema,
  TokenIssuedSchema,
  TokenMetaSchema,
  AuthExchangeResponseSchema,
  ItemSummarySchema,
  ItemVersionSchema,
  ItemsListResponseSchema,
  ItemVersionsResponseSchema,
  DeviceStartResponseSchema,
  DevicePollSuccessResponseSchema,
  AdminUserSchema,
  AdminUsersListResponseSchema,
  UsersMeResponseSchema,
} from '../../src/admin-api/responses.js';

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
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
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
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_PATH = path.resolve(
  __dirname,
  '../../../mcp/src/admin-api/__snapshots__/openapi.test.ts.snap',
);

/**
 * Extract the JSON object from the vitest snapshot string.
 * The snapshot exports a template literal containing a JSON5-like object
 * (double-quoted keys/values but with trailing commas).
 */
function loadSnapshot(): Record<string, unknown> {
  const content = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  // Extract content between the backticks
  const match = content.match(/= `\n([\s\S]+?)\n`/);
  if (!match || !match[1]) {
    throw new Error(`Could not extract JSON from snapshot at ${SNAPSHOT_PATH}`);
  }
  // Strip trailing commas before } and ] (JS object literal syntax → valid JSON)
  const jsonStr = match[1]
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(jsonStr) as Record<string, unknown>;
}

function getSchemaRequired(snapshot: Record<string, unknown>, schemaName: string): string[] {
  const components = snapshot['components'] as Record<string, unknown>;
  const schemas = components['schemas'] as Record<string, unknown>;
  const schema = schemas[schemaName] as Record<string, unknown> | undefined;
  if (!schema) throw new Error(`Schema '${schemaName}' not found in snapshot`);
  return (schema['required'] as string[]) ?? [];
}

function getSchemaProperties(snapshot: Record<string, unknown>, schemaName: string): string[] {
  const components = snapshot['components'] as Record<string, unknown>;
  const schemas = components['schemas'] as Record<string, unknown>;
  const schema = schemas[schemaName] as Record<string, unknown> | undefined;
  if (!schema) throw new Error(`Schema '${schemaName}' not found in snapshot`);
  const properties = schema['properties'] as Record<string, unknown> | undefined;
  return Object.keys(properties ?? {});
}

describe('snapshot-drift', () => {
  test('S-1: vendored Zod schemas field sets match OpenAPI snapshot', () => {
    const snapshot = loadSnapshot();

    // Project
    const projectKeys = Object.keys(ProjectSchema.shape);
    const projectSnapshotKeys = getSchemaProperties(snapshot, 'Project');
    expect(projectKeys.sort()).toEqual(projectSnapshotKeys.sort());
    const projectRequired = getSchemaRequired(snapshot, 'Project');
    for (const key of projectRequired) {
      assert.ok(String(projectKeys).includes(key));
    }

    // Member
    const memberKeys = Object.keys(MemberSchema.shape);
    const memberSnapshotKeys = getSchemaProperties(snapshot, 'Member');
    expect(memberKeys.sort()).toEqual(memberSnapshotKeys.sort());
    const memberRequired = getSchemaRequired(snapshot, 'Member');
    for (const key of memberRequired) {
      assert.ok(String(memberKeys).includes(key));
    }

    // InviteCreated (top-level properties only, not nested member)
    const inviteKeys = Object.keys(InviteCreatedSchema.shape);
    const inviteSnapshotKeys = getSchemaProperties(snapshot, 'InviteCreated');
    expect(inviteKeys.sort()).toEqual(inviteSnapshotKeys.sort());
    const inviteRequired = getSchemaRequired(snapshot, 'InviteCreated');
    for (const key of inviteRequired) {
      assert.ok(String(inviteKeys).includes(key));
    }

    // TokenMeta — base schema
    const tokenMetaKeys = Object.keys(TokenMetaSchema.shape);
    const tokenMetaSnapshotKeys = getSchemaProperties(snapshot, 'TokenMeta');
    expect(tokenMetaKeys.sort()).toEqual(tokenMetaSnapshotKeys.sort());

    // TokenIssued = TokenMeta + token field
    const tokenIssuedKeys = Object.keys(TokenIssuedSchema.shape);
    // TokenIssued in snapshot is allOf [TokenMeta, {token}] — check token field included
    assert.ok(String(tokenIssuedKeys).includes('token'));
    for (const key of tokenMetaSnapshotKeys) {
      assert.ok(String(tokenIssuedKeys).includes(key));
    }

    // AuthExchangeResponse — STORY-004-08
    const authExchangeKeys = Object.keys(AuthExchangeResponseSchema.shape);
    const authExchangeSnapshotKeys = getSchemaProperties(snapshot, 'AuthExchangeResponse');
    expect(authExchangeKeys.sort()).toEqual(authExchangeSnapshotKeys.sort());
    const authExchangeRequired = getSchemaRequired(snapshot, 'AuthExchangeResponse');
    for (const key of authExchangeRequired) {
      assert.ok(String(authExchangeKeys).includes(key));
    }

    // ItemSummary — STORY-004-09
    const itemSummaryKeys = Object.keys(ItemSummarySchema.shape);
    const itemSummarySnapshotKeys = getSchemaProperties(snapshot, 'ItemSummary');
    expect(itemSummaryKeys.sort()).toEqual(itemSummarySnapshotKeys.sort());
    const itemSummaryRequired = getSchemaRequired(snapshot, 'ItemSummary');
    for (const key of itemSummaryRequired) {
      assert.ok(String(itemSummaryKeys).includes(key));
    }

    // ItemVersion — STORY-004-09
    const itemVersionKeys = Object.keys(ItemVersionSchema.shape);
    const itemVersionSnapshotKeys = getSchemaProperties(snapshot, 'ItemVersion');
    expect(itemVersionKeys.sort()).toEqual(itemVersionSnapshotKeys.sort());
    const itemVersionRequired = getSchemaRequired(snapshot, 'ItemVersion');
    for (const key of itemVersionRequired) {
      assert.ok(String(itemVersionKeys).includes(key));
    }

    // ItemsListResponse — STORY-004-09 (top-level shape; items array is not drilled)
    const itemsListKeys = Object.keys(ItemsListResponseSchema.shape);
    const itemsListSnapshotKeys = getSchemaProperties(snapshot, 'ItemsListResponse');
    expect(itemsListKeys.sort()).toEqual(itemsListSnapshotKeys.sort());

    // ItemVersionsResponse — STORY-004-09
    const itemVersionsResponseKeys = Object.keys(ItemVersionsResponseSchema.shape);
    const itemVersionsResponseSnapshotKeys = getSchemaProperties(snapshot, 'ItemVersionsResponse');
    expect(itemVersionsResponseKeys.sort()).toEqual(itemVersionsResponseSnapshotKeys.sort());

    // DeviceStartResponse — STORY-005-06
    const deviceStartKeys = Object.keys(DeviceStartResponseSchema.shape);
    const deviceStartSnapshotKeys = getSchemaProperties(snapshot, 'DeviceStartResponse');
    expect(deviceStartKeys.sort()).toEqual(deviceStartSnapshotKeys.sort());
    const deviceStartRequired = getSchemaRequired(snapshot, 'DeviceStartResponse');
    for (const key of deviceStartRequired) {
      assert.ok(String(deviceStartKeys).includes(key));
    }

    // DevicePollSuccessResponse — STORY-005-06
    const devicePollSuccessKeys = Object.keys(DevicePollSuccessResponseSchema.shape);
    const devicePollSuccessSnapshotKeys = getSchemaProperties(snapshot, 'DevicePollSuccessResponse');
    expect(devicePollSuccessKeys.sort()).toEqual(devicePollSuccessSnapshotKeys.sort());
    const devicePollSuccessRequired = getSchemaRequired(snapshot, 'DevicePollSuccessResponse');
    for (const key of devicePollSuccessRequired) {
      assert.ok(String(devicePollSuccessKeys).includes(key));
    }

    // AdminUser — STORY-006-09
    const adminUserKeys = Object.keys(AdminUserSchema.shape);
    const adminUserSnapshotKeys = getSchemaProperties(snapshot, 'AdminUser');
    expect(adminUserKeys.sort()).toEqual(adminUserSnapshotKeys.sort());
    const adminUserRequired = getSchemaRequired(snapshot, 'AdminUser');
    for (const key of adminUserRequired) {
      assert.ok(String(adminUserKeys).includes(key));
    }

    // AdminUsersList — STORY-006-09
    const adminUsersListKeys = Object.keys(AdminUsersListResponseSchema.shape);
    const adminUsersListSnapshotKeys = getSchemaProperties(snapshot, 'AdminUsersList');
    expect(adminUsersListKeys.sort()).toEqual(adminUsersListSnapshotKeys.sort());
    const adminUsersListRequired = getSchemaRequired(snapshot, 'AdminUsersList');
    for (const key of adminUsersListRequired) {
      assert.ok(String(adminUsersListKeys).includes(key));
    }

    // UsersMe — STORY-006-09
    const usersMeKeys = Object.keys(UsersMeResponseSchema.shape);
    const usersMeSnapshotKeys = getSchemaProperties(snapshot, 'UsersMe');
    expect(usersMeKeys.sort()).toEqual(usersMeSnapshotKeys.sort());
    const usersMeRequired = getSchemaRequired(snapshot, 'UsersMe');
    for (const key of usersMeRequired) {
      assert.ok(String(usersMeKeys).includes(key));
    }
  });
});
