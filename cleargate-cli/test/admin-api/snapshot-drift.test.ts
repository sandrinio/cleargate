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
import { describe, it, expect } from 'vitest';
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
} from '../../src/admin-api/responses.js';

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
  it('S-1: vendored Zod schemas field sets match OpenAPI snapshot', () => {
    const snapshot = loadSnapshot();

    // Project
    const projectKeys = Object.keys(ProjectSchema.shape);
    const projectSnapshotKeys = getSchemaProperties(snapshot, 'Project');
    expect(projectKeys.sort()).toEqual(projectSnapshotKeys.sort());
    const projectRequired = getSchemaRequired(snapshot, 'Project');
    for (const key of projectRequired) {
      expect(projectKeys).toContain(key);
    }

    // Member
    const memberKeys = Object.keys(MemberSchema.shape);
    const memberSnapshotKeys = getSchemaProperties(snapshot, 'Member');
    expect(memberKeys.sort()).toEqual(memberSnapshotKeys.sort());
    const memberRequired = getSchemaRequired(snapshot, 'Member');
    for (const key of memberRequired) {
      expect(memberKeys).toContain(key);
    }

    // InviteCreated (top-level properties only, not nested member)
    const inviteKeys = Object.keys(InviteCreatedSchema.shape);
    const inviteSnapshotKeys = getSchemaProperties(snapshot, 'InviteCreated');
    expect(inviteKeys.sort()).toEqual(inviteSnapshotKeys.sort());
    const inviteRequired = getSchemaRequired(snapshot, 'InviteCreated');
    for (const key of inviteRequired) {
      expect(inviteKeys).toContain(key);
    }

    // TokenMeta — base schema
    const tokenMetaKeys = Object.keys(TokenMetaSchema.shape);
    const tokenMetaSnapshotKeys = getSchemaProperties(snapshot, 'TokenMeta');
    expect(tokenMetaKeys.sort()).toEqual(tokenMetaSnapshotKeys.sort());

    // TokenIssued = TokenMeta + token field
    const tokenIssuedKeys = Object.keys(TokenIssuedSchema.shape);
    // TokenIssued in snapshot is allOf [TokenMeta, {token}] — check token field included
    expect(tokenIssuedKeys).toContain('token');
    for (const key of tokenMetaSnapshotKeys) {
      expect(tokenIssuedKeys).toContain(key);
    }

    // AuthExchangeResponse — STORY-004-08
    const authExchangeKeys = Object.keys(AuthExchangeResponseSchema.shape);
    const authExchangeSnapshotKeys = getSchemaProperties(snapshot, 'AuthExchangeResponse');
    expect(authExchangeKeys.sort()).toEqual(authExchangeSnapshotKeys.sort());
    const authExchangeRequired = getSchemaRequired(snapshot, 'AuthExchangeResponse');
    for (const key of authExchangeRequired) {
      expect(authExchangeKeys).toContain(key);
    }

    // ItemSummary — STORY-004-09
    const itemSummaryKeys = Object.keys(ItemSummarySchema.shape);
    const itemSummarySnapshotKeys = getSchemaProperties(snapshot, 'ItemSummary');
    expect(itemSummaryKeys.sort()).toEqual(itemSummarySnapshotKeys.sort());
    const itemSummaryRequired = getSchemaRequired(snapshot, 'ItemSummary');
    for (const key of itemSummaryRequired) {
      expect(itemSummaryKeys).toContain(key);
    }

    // ItemVersion — STORY-004-09
    const itemVersionKeys = Object.keys(ItemVersionSchema.shape);
    const itemVersionSnapshotKeys = getSchemaProperties(snapshot, 'ItemVersion');
    expect(itemVersionKeys.sort()).toEqual(itemVersionSnapshotKeys.sort());
    const itemVersionRequired = getSchemaRequired(snapshot, 'ItemVersion');
    for (const key of itemVersionRequired) {
      expect(itemVersionKeys).toContain(key);
    }

    // ItemsListResponse — STORY-004-09 (top-level shape; items array is not drilled)
    const itemsListKeys = Object.keys(ItemsListResponseSchema.shape);
    const itemsListSnapshotKeys = getSchemaProperties(snapshot, 'ItemsListResponse');
    expect(itemsListKeys.sort()).toEqual(itemsListSnapshotKeys.sort());

    // ItemVersionsResponse — STORY-004-09
    const itemVersionsResponseKeys = Object.keys(ItemVersionsResponseSchema.shape);
    const itemVersionsResponseSnapshotKeys = getSchemaProperties(snapshot, 'ItemVersionsResponse');
    expect(itemVersionsResponseKeys.sort()).toEqual(itemVersionsResponseSnapshotKeys.sort());
  });
});
