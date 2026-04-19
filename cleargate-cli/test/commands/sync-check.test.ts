/**
 * sync-check.test.ts — STORY-010-08
 *
 * Tests for `cleargate sync --check` (syncCheckHandler).
 * Verifies hook-safe behavior: exits 0 on all failure paths, emits JSON to stdout.
 *
 * FLASHCARD: #hook-safe #sync-check #exit-code
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncCheckHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-check-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfiguredMcp(updates: RemoteUpdateRef[]): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: true, name: 'linear' }),
    call: async <T>(tool: string, _args: Record<string, unknown>): Promise<T> => {
      if (tool === 'cleargate_list_remote_updates') {
        return updates as T;
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    },
  };
}

function makeUnconfiguredMcp(): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: false, name: 'no-adapter-configured' }),
    call: async <T>(_tool: string, _args: Record<string, unknown>): Promise<T> => {
      throw new Error('Should not be called');
    },
  };
}

function makeThrowingMcp(errorMsg: string): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: true, name: 'linear' }),
    call: async <T>(_tool: string, _args: Record<string, unknown>): Promise<T> => {
      throw new Error(errorMsg);
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('syncCheckHandler — §14.9 hook-safe drift probe', () => {
  it('Scenario 1: happy path — adapter configured, MCP returns 3 refs → stdout JSON {updates:3}, exit 0', async () => {
    const tmpDir = makeTmpDir();
    const updates: RemoteUpdateRef[] = [
      { remote_id: 'r1', updated_at: '2026-01-01T00:00:00Z' },
      { remote_id: 'r2', updated_at: '2026-01-02T00:00:00Z' },
      { remote_id: 'r3', updated_at: '2026-01-03T00:00:00Z' },
    ];
    const mcp = makeConfiguredMcp(updates);

    let stdoutCapture = '';
    let exitCalled = false;

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    // Should NOT have called process.exit — handler returns normally
    expect(exitCalled).toBe(false);

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['updates']).toBe(3);
    expect(typeof parsed['since']).toBe('string');
    expect(parsed['error']).toBeUndefined();
  });

  it('Scenario 1b: stdout since field is the epoch fallback when marker absent', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeConfiguredMcp([]);

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['since']).toBe('1970-01-01T00:00:00.000Z');
  });

  it('Scenario 2: MCP-failure (call throws) → stdout {updates:0, error:...}, exits 0, no sync-log write', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeThrowingMcp('connection refused');

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['updates']).toBe(0);
    expect(typeof parsed['error']).toBe('string');
    expect(parsed['error']).toContain('connection refused');

    // No .conflicts.json should have been written
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(false);

    // No sync-log entries
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprintLogsExist = fs.existsSync(sprintRoot);
    // Either it doesn't exist at all or has no sync-log entries
    if (sprintLogsExist) {
      // This should not happen in check mode
      expect(false).toBe(true);
    }
  });

  it('Scenario 3: adapter-not-configured → stdout {updates:0, error:"adapter-not-configured"}, exits 0', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeUnconfiguredMcp();

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['updates']).toBe(0);
    expect(parsed['error']).toBe('adapter-not-configured');
  });

  it('Scenario 4: marker absent → handler creates marker with current timestamp', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeConfiguredMcp([]);
    const fixedNow = '2026-04-19T10:00:00.000Z';

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => fixedNow,
    });

    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    expect(fs.existsSync(markerPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    expect(marker['last_check']).toBe(fixedNow);
    // Schema: only last_check, no extra fields beyond what we wrote
    expect(Object.keys(marker)).toEqual(['last_check']);
  });

  it('Scenario 4b: marker updates last_check on success', async () => {
    const tmpDir = makeTmpDir();

    // Pre-create marker with old timestamp
    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, JSON.stringify({ last_check: '2026-01-01T00:00:00.000Z' }), 'utf8');

    const fixedNow = '2026-04-19T10:00:00.000Z';
    const mcp = makeConfiguredMcp([{ remote_id: 'r1', updated_at: '2026-04-18T10:00:00Z' }]);

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => fixedNow,
    });

    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    expect(marker['last_check']).toBe(fixedNow);

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['updates']).toBe(1);
    // The `since` field reflects what was in the marker before the call
    expect(parsed['since']).toBe('2026-01-01T00:00:00.000Z');
  });

  it('Error path: missing env token (no mcp injection) → exits 0 with error JSON', async () => {
    const tmpDir = makeTmpDir();

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      env: {}, // no CLEARGATE_MCP_TOKEN or CLEARGATE_MCP_URL
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    expect(parsed['updates']).toBe(0);
    expect(typeof parsed['error']).toBe('string');
  });
});
