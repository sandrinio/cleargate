/**
 * R-16: End-to-end smoke for `cleargate join`.
 *
 * Runs ONLY when CLEARGATE_E2E=1 is set. Requires:
 *   - docker-compose up (Postgres 18 + Redis 8) with MCP server running at
 *     process.env.MCP_BASE_URL (default: http://localhost:3000)
 *   - An admin JWT obtainable via POST /admin/auth (dev-issue-token credentials)
 *
 * Sequence:
 *   1. Issue an admin JWT
 *   2. Create a project via POST /admin-api/v1/projects
 *   3. Create a member + invite via POST /admin-api/v1/projects/:pid/members
 *   4. Call joinHandler in-process with the invite URL
 *   5. Assert stdout contains "joined project"
 *   6. Assert the refresh token was saved to the FileTokenStore
 *   7. Assert POST /auth/refresh with that token returns 200 + access_token
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { joinHandler } from '../../src/commands/join.js';
import { FileTokenStore } from '../../src/auth/file-store.js';

const E2E = !!process.env['CLEARGATE_E2E'];
const MCP_BASE = process.env['MCP_BASE_URL'] ?? 'http://localhost:3000';
const ADMIN_URL = process.env['CLEARGATE_ADMIN_URL'] ?? 'http://localhost:3001';

describe.skipIf(!E2E)('R-16: join smoke (real infra)', () => {
  let adminToken: string;
  let projectId: string;
  let inviteUrl: string;
  let refreshToken: string | null;
  let tmpAuthFile: string;

  beforeAll(async () => {
    // 1. Issue admin token
    const issueRes = await fetch(`${ADMIN_URL}/admin/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: process.env['ADMIN_USERNAME'] ?? 'admin',
        password: process.env['ADMIN_PASSWORD'] ?? 'admin',
      }),
    });
    if (!issueRes.ok) {
      throw new Error(`Admin auth failed: ${issueRes.status}`);
    }
    const issueBody = (await issueRes.json()) as { token: string };
    adminToken = issueBody.token;

    // 2. Create project
    const projectRes = await fetch(`${ADMIN_URL}/admin-api/v1/projects`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: `smoke-${Date.now()}`, slug: `smoke-${Date.now()}` }),
    });
    if (!projectRes.ok) {
      throw new Error(`Create project failed: ${projectRes.status}`);
    }
    const projectBody = (await projectRes.json()) as { id: string };
    projectId = projectBody.id;

    // 3. Create member + invite
    const memberRes = await fetch(
      `${ADMIN_URL}/admin-api/v1/projects/${projectId}/members`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: `smoke-${Date.now()}@example.com`,
          role: 'user',
          display_name: 'Smoke Tester',
        }),
      },
    );
    if (!memberRes.ok) {
      throw new Error(`Create member failed: ${memberRes.status}`);
    }
    const memberBody = (await memberRes.json()) as { invite_url: string };
    inviteUrl = memberBody.invite_url;

    // Prepare temp auth file (so we don't touch the real ~/.cleargate/auth.json)
    tmpAuthFile = path.join(os.tmpdir(), `cleargate-e2e-${Date.now()}.json`);
  });

  it('joinHandler stdout contains "joined project"', async () => {
    const store = new FileTokenStore(tmpAuthFile);
    const capturedStdout: string[] = [];
    const capturedStderr: string[] = [];

    await joinHandler({
      inviteUrl,
      profile: 'default',
      createStore: async () => store,
      stdout: (s) => { capturedStdout.push(s); },
      stderr: (s) => { capturedStderr.push(s); },
    });

    expect(capturedStdout.join('')).toContain('joined project');
    expect(capturedStderr.join('')).toBe('');
  });

  it('refresh token is persisted in FileTokenStore', async () => {
    const store = new FileTokenStore(tmpAuthFile);
    refreshToken = await store.load('default');
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken!.length).toBeGreaterThan(20);
  });

  it('refresh token exchanges for access_token at /auth/refresh', async () => {
    expect(refreshToken).toBeTruthy();
    const refreshRes = await fetch(`${MCP_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    expect(refreshRes.status).toBe(200);
    const body = (await refreshRes.json()) as { access_token?: string };
    expect(typeof body.access_token).toBe('string');
  });

  it('cleanup temp auth file', async () => {
    await fs.rm(tmpAuthFile, { force: true });
  });
});
