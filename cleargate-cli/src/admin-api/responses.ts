/**
 * Vendored Zod response schemas — hand-authored from
 * mcp/src/admin-api/__snapshots__/openapi.test.ts.snap
 *
 * Snapshot drift is detected by cleargate-cli/test/admin-api/snapshot-drift.test.ts,
 * which reads the snapshot file at runtime and asserts field-set equality.
 */
import { z } from 'zod';

export const ProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .strict();

export type Project = z.infer<typeof ProjectSchema>;

export const MemberSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    email: z.string(),
    role: z.string(),
    display_name: z.string().nullable().optional(),
    created_at: z.string(),
    status: z.enum(['pending', 'active', 'expired']),
  })
  .strict();

export type Member = z.infer<typeof MemberSchema>;

export const InviteCreatedSchema = z
  .object({
    member: MemberSchema,
    invite_url: z.string(),
    invite_token: z.string(),
    invite_expires_in: z.number().int(),
  })
  .strict();

export type InviteCreated = z.infer<typeof InviteCreatedSchema>;

export const TokenMetaSchema = z
  .object({
    id: z.string(),
    member_id: z.string(),
    name: z.string(),
    created_at: z.string(),
    expires_at: z.string().nullable().optional(),
    last_used_at: z.string().nullable().optional(),
    revoked_at: z.string().nullable().optional(),
  })
  .strict();

export type TokenMeta = z.infer<typeof TokenMetaSchema>;

// TokenIssued = TokenMeta + plaintext token field (returned exactly once)
export const TokenIssuedSchema = z
  .object({
    id: z.string(),
    member_id: z.string(),
    name: z.string(),
    created_at: z.string(),
    expires_at: z.string().nullable().optional(),
    last_used_at: z.string().nullable().optional(),
    revoked_at: z.string().nullable().optional(),
    token: z.string(),
  })
  .strict();

export type TokenIssued = z.infer<typeof TokenIssuedSchema>;

export const AuthExchangeResponseSchema = z
  .object({
    admin_token: z.string(),
    expires_at: z.string(),
  })
  .strict();

export type AuthExchangeResponse = z.infer<typeof AuthExchangeResponseSchema>;

export const ErrorBodySchema = z
  .object({
    error: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

// ── Items admin API (STORY-004-09) ───────────────────────────────────────────

export const ItemSummarySchema = z
  .object({
    id: z.string(),
    cleargate_id: z.string(),
    type: z.string(),
    title: z.string(),
    status: z.string(),
    remote_id: z.string().nullable(),
    last_pushed_at: z.string().nullable(),
    pushed_by_member_id: z.string().nullable(),
    version: z.number().int(),
    updated_at: z.string(),
  })
  .strict();

export type ItemSummary = z.infer<typeof ItemSummarySchema>;

export const ItemsListResponseSchema = z
  .object({
    items: z.array(ItemSummarySchema),
    next_cursor: z.string().nullable(),
  })
  .strict();

export type ItemsListResponse = z.infer<typeof ItemsListResponseSchema>;

export const ItemVersionSchema = z
  .object({
    version: z.number().int(),
    pushed_by_member_id: z.string().nullable(),
    pushed_at: z.string(),
    status: z.string(),
    diff_summary: z.string().nullable(),
  })
  .strict();

export type ItemVersion = z.infer<typeof ItemVersionSchema>;

export const ItemVersionsResponseSchema = z
  .object({
    versions: z.array(ItemVersionSchema),
  })
  .strict();

export type ItemVersionsResponse = z.infer<typeof ItemVersionsResponseSchema>;
