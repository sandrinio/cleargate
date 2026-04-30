/**
 * sync-work-items.test.ts — STORY-023-01
 *
 * Tests for `cleargate sync work-items` (syncWorkItemsHandler).
 * Each test covers one Gherkin scenario from story §2.1.
 *
 * All scenarios:
 *   1. All items new — pushed successfully
 *   2. Unchanged items are skipped (no MCP call)
 *   3. Conflict returned by server is reported to stderr
 *   4. MCP server unreachable exits 1
 *   5. No MCP URL configured exits 2
 *
 * MCP is mocked at the HTTP boundary (injected McpClient seam).
 * Real filesystem tmpdir used for delivery/ fixtures.
 *
 * FLASHCARD 2026-04-19 #cli #frontmatter #parse:
 *   parseFrontmatter strips one leading blank from body.
 *   Write fixtures as serializeFrontmatter(fm) + '\n\n' + body.
 *
 * FLASHCARD 2026-04-18 #cli #vitest #vi-mock-hoisting:
 *   vi.mock() is hoisted — variables used in factory must be vi.hoisted().
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncWorkItemsHandler } from '../../src/commands/sync-work-items.js';
import type { McpClient, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import { createHash } from 'node:crypto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-wi-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Write a work item fixture to tmpDir/.cleargate/delivery/pending-sync/
 * Returns the full file path.
 */
function makeWorkItemFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = 'Story body content.',
  subDir: 'pending-sync' | 'archive' = 'pending-sync',
): string {
  const dir = path.join(tmpDir, '.cleargate', 'delivery', subDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/** Attribution fields excluded from sha computation (mirrors work-items.ts). */
const ATTRIBUTION_FIELDS = new Set(['last_synced_body_sha', 'server_pushed_at_version']);

/**
 * Compute the canonical sha per the driver implementation:
 *   sha256(body + serializeFrontmatter(fm_without_attribution_fields))
 *
 * Attribution fields are excluded so write-back does not dirty the sha.
 */
function computeSha(fm: Record<string, unknown>, body: string): string {
  const fmForSha: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (!ATTRIBUTION_FIELDS.has(k)) fmForSha[k] = v;
  }
  return createHash('sha256')
    .update(body + serializeFrontmatter(fmForSha))
    .digest('hex');
}

/**
 * Build a minimal mock McpClient.
 * syncResponse controls what cleargate_sync_work_items returns.
 */
function makeMockMcp(
  syncResponse: {
    accepted?: Array<{ cleargate_id: string; version: number; pushed_at: string; body_sha: string }>;
    conflicts?: Array<{
      cleargate_id: string;
      local_sha: string;
      remote_sha: string;
      divergence_path: string;
    }>;
    errors?: Array<{ cleargate_id: string; code: string; message: string }>;
  } = {},
): McpClient & { calls: Array<{ tool: string; args: Record<string, unknown> }> } {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const response = {
    accepted: syncResponse.accepted ?? [],
    conflicts: syncResponse.conflicts ?? [],
    errors: syncResponse.errors ?? [],
  };
  return {
    calls,
    call: vi.fn(async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
      calls.push({ tool, args });
      if (tool === 'cleargate_sync_work_items') {
        return response as unknown as T;
      }
      throw new Error(`unexpected tool: ${tool}`);
    }),
    adapterInfo: vi.fn(async (): Promise<AdapterInfo> => ({
      configured: true,
      name: 'linear',
    })),
  };
}

/** Standard test seam builder. */
function makeSeams(tmpDir: string, mcp: McpClient) {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  let exitCode: number | null = null;

  return {
    stdoutLines,
    stderrLines,
    exitCode: () => exitCode,
    opts: {
      projectRoot: tmpDir,
      mcp,
      stdout: (s: string) => {
        stdoutLines.push(s);
      },
      stderr: (s: string) => {
        stderrLines.push(s);
      },
      exit: ((c: number): never => {
        exitCode = c;
        throw Object.assign(new Error(`exit(${c})`), { __exit: true });
      }) as (c: number) => never,
      now: () => '2026-04-30T12:00:00.000Z',
      adminUrlFn: () => 'https://admin.cleargate.soula.ge/',
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cleargate sync work-items', () => {
  // ── Scenario 1: All items new — pushed successfully ──────────────────────

  it('Scenario: All items new — pushed successfully', async () => {
    const tmpDir = makeTmpDir();
    try {
      // Given: 3 work items in pending-sync, none previously synced
      const fm1 = {
        cleargate_id: 'STORY-001-01',
        story_id: 'STORY-001-01',
        status: 'Draft',
        approved: false,
        last_synced_body_sha: null,
      };
      const fm2 = {
        cleargate_id: 'EPIC-002',
        epic_id: 'EPIC-002',
        status: 'Approved',
        approved: true,
        last_synced_body_sha: null,
      };
      const fm3 = {
        cleargate_id: 'STORY-003-01',
        story_id: 'STORY-003-01',
        status: 'Approved',
        approved: true,
        last_synced_body_sha: null,
      };

      const body1 = 'Story 1 body.';
      const body2 = 'Epic 2 body.';
      const body3 = 'Story 3 body.';

      const sha1 = computeSha(fm1, body1);
      const sha2 = computeSha(fm2, body2);
      const sha3 = computeSha(fm3, body3);

      makeWorkItemFile(tmpDir, 'STORY-001-01.md', fm1, body1);
      makeWorkItemFile(tmpDir, 'EPIC-002.md', fm2, body2);
      makeWorkItemFile(tmpDir, 'STORY-003-01.md', fm3, body3);

      // And: the MCP server responds with all 3 accepted
      const mcp = makeMockMcp({
        accepted: [
          { cleargate_id: 'STORY-001-01', version: 1, pushed_at: '2026-04-30T12:00:01Z', body_sha: sha1 },
          { cleargate_id: 'EPIC-002', version: 1, pushed_at: '2026-04-30T12:00:01Z', body_sha: sha2 },
          { cleargate_id: 'STORY-003-01', version: 1, pushed_at: '2026-04-30T12:00:01Z', body_sha: sha3 },
        ],
      });

      const { stdoutLines, stderrLines, exitCode, opts } = makeSeams(tmpDir, mcp);

      // When: cleargate sync work-items runs
      await syncWorkItemsHandler(opts);

      // Then: stdout contains summary
      const allStdout = stdoutLines.join('');
      expect(allStdout).toContain('sync: 3 accepted, 0 conflicts, 0 errors');

      // And: stdout contains admin URL line
      expect(allStdout).toContain('→ View synced items:');

      // And: no errors
      expect(stderrLines.join('')).toBe('');
      expect(exitCode()).toBeNull();

      // And: each item's local frontmatter has last_synced_body_sha set
      const file1Raw = fs.readFileSync(
        path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-001-01.md'),
        'utf8',
      );
      const { fm: updatedFm1 } = parseFrontmatter(file1Raw);
      expect(updatedFm1['last_synced_body_sha']).toBe(sha1);
      expect(updatedFm1['server_pushed_at_version']).toBe(1);
    } finally {
      cleanup(tmpDir);
    }
  });

  // ── Scenario 2: Unchanged items are skipped ─────────────────────────────

  it('Scenario: Unchanged items are skipped', async () => {
    const tmpDir = makeTmpDir();
    try {
      // Given: 2 items, both with last_synced_body_sha matching current sha256
      //
      // The driver computes file_sha = sha256(body + serialize(fm_without_attribution_fields))
      // where attribution fields (last_synced_body_sha, server_pushed_at_version)
      // are excluded so write-back doesn't immediately dirty the sha.
      //
      // Simulate post-sync state: fm on disk has attribution fields from the
      // previous sync write-back. The sha stored in last_synced_body_sha must
      // equal sha256(body + serialize(fm_without_attribution)).
      const body1 = 'Unchanged story body.';
      const body2 = 'Unchanged epic body.';
      const baseFm1 = {
        cleargate_id: 'STORY-010-01',
        story_id: 'STORY-010-01',
        status: 'Approved',
        approved: true,
      };
      const baseFm2 = {
        cleargate_id: 'EPIC-011',
        epic_id: 'EPIC-011',
        status: 'Approved',
        approved: true,
      };

      // sha = sha256(body + serialize(fm_without_attribution)) — this is stable
      const sha1 = computeSha(baseFm1, body1);
      const sha2 = computeSha(baseFm2, body2);

      // File on disk after previous sync write-back
      const fm1 = { ...baseFm1, last_synced_body_sha: sha1, server_pushed_at_version: 1 };
      const fm2 = { ...baseFm2, last_synced_body_sha: sha2, server_pushed_at_version: 1 };

      makeWorkItemFile(tmpDir, 'STORY-010-01.md', fm1, body1);
      makeWorkItemFile(tmpDir, 'EPIC-011.md', fm2, body2);

      const mcp = makeMockMcp();
      const { stdoutLines, stderrLines, exitCode, opts } = makeSeams(tmpDir, mcp);

      // When: cleargate sync work-items runs
      await syncWorkItemsHandler(opts);

      // Then: stdout contains "0 items changed"
      const allStdout = stdoutLines.join('');
      expect(allStdout).toContain('sync: 0 items changed (nothing to push)');

      // And: no MCP call is made
      expect(mcp.calls).toHaveLength(0);

      // And: exit code is 0 (no exit seam called)
      expect(exitCode()).toBeNull();
      expect(stderrLines.join('')).toBe('');
    } finally {
      cleanup(tmpDir);
    }
  });

  // ── Scenario 3: Conflict returned by server is reported to stderr ────────

  it('Scenario: Conflict returned by server is reported to stderr', async () => {
    const tmpDir = makeTmpDir();
    try {
      // Given: one item accepted and one item has a conflict
      const body1 = 'Accepted item body.';
      const body2 = 'Conflict item body.';
      const fm1 = {
        cleargate_id: 'STORY-020-01',
        story_id: 'STORY-020-01',
        status: 'Approved',
        approved: true,
        last_synced_body_sha: null,
      };
      const fm2 = {
        cleargate_id: 'STORY-020-02',
        story_id: 'STORY-020-02',
        status: 'Draft',
        approved: false,
        last_synced_body_sha: 'old-sha-abc',
      };

      makeWorkItemFile(tmpDir, 'STORY-020-01.md', fm1, body1);
      makeWorkItemFile(tmpDir, 'STORY-020-02.md', fm2, body2);

      const mcp = makeMockMcp({
        accepted: [
          {
            cleargate_id: 'STORY-020-01',
            version: 1,
            pushed_at: '2026-04-30T12:00:01Z',
            body_sha: computeSha(fm1, body1),
          },
        ],
        conflicts: [
          {
            cleargate_id: 'STORY-020-02',
            local_sha: computeSha(fm2, body2).slice(0, 8),
            remote_sha: 'deadbeef',
            divergence_path: 'frontmatter.status',
          },
        ],
      });

      const { stdoutLines, stderrLines, exitCode, opts } = makeSeams(tmpDir, mcp);

      // When: cleargate sync work-items runs
      await syncWorkItemsHandler(opts);

      // Then: stdout contains summary with 1 conflict
      const allStdout = stdoutLines.join('');
      expect(allStdout).toContain('sync: 1 accepted, 1 conflicts, 0 errors');

      // And: stderr contains the conflict item's cleargate_id and divergence_path
      const allStderr = stderrLines.join('');
      expect(allStderr).toContain('STORY-020-02');
      expect(allStderr).toContain('frontmatter.status');

      // And: exit code is 0 (conflicts are informational)
      expect(exitCode()).toBeNull();
    } finally {
      cleanup(tmpDir);
    }
  });

  // ── Scenario 4: MCP server unreachable exits 1 ──────────────────────────

  it('Scenario: MCP server unreachable exits 1', async () => {
    const tmpDir = makeTmpDir();
    try {
      // Given: there is one changed item (so driver tries to call MCP)
      const fm = {
        cleargate_id: 'STORY-030-01',
        story_id: 'STORY-030-01',
        status: 'Draft',
        approved: false,
        last_synced_body_sha: null,
      };
      makeWorkItemFile(tmpDir, 'STORY-030-01.md', fm, 'Body content.');

      // And: MCP client throws a transport error
      const mcp: McpClient & { calls: Array<{ tool: string; args: Record<string, unknown> }> } = {
        calls: [],
        call: vi.fn(async () => {
          throw new Error('MCP transport error calling cleargate_sync_work_items: ECONNREFUSED');
        }),
        adapterInfo: vi.fn(async (): Promise<AdapterInfo> => ({
          configured: true,
          name: 'linear',
        })),
      };

      const { stderrLines, exitCode, opts } = makeSeams(tmpDir, mcp);

      // When: cleargate sync work-items runs
      let threw = false;
      try {
        await syncWorkItemsHandler(opts);
      } catch (err) {
        if ((err as Error & { __exit?: boolean }).__exit) threw = true;
        else throw err;
      }

      // Then: stderr contains "Error:"
      const allStderr = stderrLines.join('');
      expect(allStderr).toContain('Error:');

      // And: exit code is 1
      expect(exitCode()).toBe(1);
      expect(threw).toBe(true);
    } finally {
      cleanup(tmpDir);
    }
  });

  // ── Scenario 5: No MCP URL configured exits 2 ───────────────────────────

  it('Scenario: No MCP URL configured exits 2', async () => {
    const tmpDir = makeTmpDir();
    try {
      // Given: CLEARGATE_MCP_URL is unset and no config file exists
      // We do NOT inject an mcp seam — so resolveMcp() runs the real path
      // with a sanitised env that has no MCP URL
      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];
      let exitCode: number | null = null;

      const opts: Parameters<typeof syncWorkItemsHandler>[0] = {
        projectRoot: tmpDir,
        // No mcp seam — triggers the URL-resolution path
        env: {
          // Explicitly clear any MCP URL
          HOME: process.env['HOME'] ?? '',
          // No CLEARGATE_MCP_URL
        },
        stdout: (s: string) => {
          stdoutLines.push(s);
        },
        stderr: (s: string) => {
          stderrLines.push(s);
        },
        exit: ((c: number): never => {
          exitCode = c;
          throw Object.assign(new Error(`exit(${c})`), { __exit: true });
        }) as (c: number) => never,
        now: () => '2026-04-30T12:00:00.000Z',
        adminUrlFn: () => 'https://admin.cleargate.soula.ge/',
      };

      // When: cleargate sync work-items runs
      let threw = false;
      try {
        await syncWorkItemsHandler(opts);
      } catch (err) {
        if ((err as Error & { __exit?: boolean }).__exit) threw = true;
        else throw err;
      }

      // Then: stderr contains "MCP URL not configured"
      const allStderr = stderrLines.join('');
      expect(allStderr).toContain('MCP URL not configured');

      // And: exit code is 2
      expect(exitCode).toBe(2);
      expect(threw).toBe(true);
    } finally {
      cleanup(tmpDir);
    }
  });

  // ── Bonus: Draft items sync without approved gate ────────────────────────

  it('Draft item (status=Draft, approved=false) syncs successfully — no approved gate', async () => {
    const tmpDir = makeTmpDir();
    try {
      // A deliberately un-approved Draft item must sync (EPIC-023 §2.1 status-blind)
      const fm = {
        cleargate_id: 'STORY-040-01',
        story_id: 'STORY-040-01',
        status: 'Draft',
        approved: false,
        last_synced_body_sha: null,
      };
      const body = 'Draft story body.';
      makeWorkItemFile(tmpDir, 'STORY-040-01.md', fm, body);

      const sha = computeSha(fm, body);
      const mcp = makeMockMcp({
        accepted: [
          { cleargate_id: 'STORY-040-01', version: 1, pushed_at: '2026-04-30T12:00:01Z', body_sha: sha },
        ],
      });

      const { stdoutLines, stderrLines, exitCode, opts } = makeSeams(tmpDir, mcp);

      await syncWorkItemsHandler(opts);

      // Must have been accepted (not refused due to approved:false)
      expect(mcp.calls).toHaveLength(1);
      expect(mcp.calls[0]!.tool).toBe('cleargate_sync_work_items');
      expect(stdoutLines.join('')).toContain('sync: 1 accepted, 0 conflicts, 0 errors');
      expect(exitCode()).toBeNull();
      expect(stderrLines.join('')).toBe('');
    } finally {
      cleanup(tmpDir);
    }
  });
});
