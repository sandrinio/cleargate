import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * inject-mcp-json.test.ts — BUG-017 + BUG-019 unit coverage.
 *
 * 0.8.0 change: stdio entry replaces http entry (BUG-019 stdio shim).
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  mergeMcpJson,
  injectMcpJson,
  buildStdioEntry,
} from '../../src/init/inject-mcp-json.js';

const STDIO_ENTRY_LATEST = buildStdioEntry('latest');
const STDIO_ENTRY_PINNED = buildStdioEntry('0.8.1');

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-mcp-json-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('mergeMcpJson (pure)', () => {
  test('greenfield: produces object with stdio cleargate entry', () => {
    const out = mergeMcpJson(null, STDIO_ENTRY_LATEST);
    const parsed = JSON.parse(out);
    assert.deepStrictEqual(parsed, { mcpServers: { cleargate: STDIO_ENTRY_LATEST } });
    assert.strictEqual(out.endsWith('\n'), true);
  });

  test('preserves unrelated mcpServers entries', () => {
    const existing = { mcpServers: { other: { command: 'foo', args: ['bar'] } } };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    assert.deepStrictEqual(parsed.mcpServers.other, { command: 'foo', args: ['bar'] });
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_LATEST);
  });

  test('preserves unrelated top-level keys', () => {
    const existing = { mcpServers: {}, someOtherKey: 'kept' } as Record<string, unknown>;
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    assert.strictEqual(parsed.someOtherKey, 'kept');
  });

  test('replaces a stale (http-shaped) cleargate entry from 0.7.x', () => {
    const existing = {
      mcpServers: { cleargate: { type: 'http', url: 'https://cleargate-mcp.soula.ge/mcp' } },
    };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_LATEST);
  });

  test('idempotent: identical input → byte-equal output', () => {
    const a = mergeMcpJson(null, STDIO_ENTRY_LATEST);
    const b = mergeMcpJson(JSON.parse(a), STDIO_ENTRY_LATEST);
    assert.strictEqual(b, a);
  });
});

describe('injectMcpJson (filesystem)', () => {
  test('greenfield (no pin): returns "created" + writes stdio entry pinned to "latest"', () => {
    const action = injectMcpJson(tmpDir);
    assert.strictEqual(action, 'created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_LATEST);
    assert.strictEqual(parsed.mcpServers.cleargate.command, 'npx');
    assert.strictEqual(parsed.mcpServers.cleargate.args[1], 'cleargate@latest');
  });

  test('greenfield with explicit pin: writes stdio entry with that version', () => {
    const action = injectMcpJson(tmpDir, '0.8.1');
    assert.strictEqual(action, 'created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_PINNED);
    assert.strictEqual(parsed.mcpServers.cleargate.args[1], 'cleargate@0.8.1');
  });

  test('returns "unchanged" on second invocation with same pin', () => {
    injectMcpJson(tmpDir, '0.8.1');
    const second = injectMcpJson(tmpDir, '0.8.1');
    assert.strictEqual(second, 'unchanged');
  });

  test('returns "updated" when pin version differs (post-upgrade re-init)', () => {
    injectMcpJson(tmpDir, '0.8.0');
    const second = injectMcpJson(tmpDir, '0.8.1');
    assert.strictEqual(second, 'updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assert.strictEqual(parsed.mcpServers.cleargate.args[1], 'cleargate@0.8.1');
  });

  test('returns "updated" when existing file has the older 0.7.x http entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify(
        { mcpServers: { cleargate: { type: 'http', url: 'https://cleargate-mcp.soula.ge/mcp' } } },
        null,
        2,
      ) + '\n',
    );
    const action = injectMcpJson(tmpDir);
    assert.strictEqual(action, 'updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_LATEST);
  });

  test('returns "updated" when existing file has the 0.8.0 cleargate-on-PATH entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify(
        { mcpServers: { cleargate: { command: 'cleargate', args: ['mcp', 'serve'] } } },
        null,
        2,
      ) + '\n',
    );
    const action = injectMcpJson(tmpDir, '0.8.1');
    assert.strictEqual(action, 'updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assert.deepStrictEqual(parsed.mcpServers.cleargate, STDIO_ENTRY_PINNED);
  });

  test('throws on malformed existing JSON (does not overwrite)', () => {
    fs.writeFileSync(path.join(tmpDir, '.mcp.json'), '{ this is not json');
    assert.throws(() => injectMcpJson(tmpDir), /not valid JSON/);
    assert.strictEqual(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'), '{ this is not json');
  });
});
