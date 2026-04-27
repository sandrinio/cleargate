/**
 * inject-mcp-json.test.ts — BUG-017 + BUG-019 unit coverage.
 *
 * 0.8.0 change: stdio entry replaces http entry (BUG-019 stdio shim).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  it('greenfield: produces object with stdio cleargate entry', () => {
    const out = mergeMcpJson(null, STDIO_ENTRY_LATEST);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({ mcpServers: { cleargate: STDIO_ENTRY_LATEST } });
    expect(out.endsWith('\n')).toBe(true);
  });

  it('preserves unrelated mcpServers entries', () => {
    const existing = { mcpServers: { other: { command: 'foo', args: ['bar'] } } };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    expect(parsed.mcpServers.other).toEqual({ command: 'foo', args: ['bar'] });
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_LATEST);
  });

  it('preserves unrelated top-level keys', () => {
    const existing = { mcpServers: {}, someOtherKey: 'kept' } as Record<string, unknown>;
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    expect(parsed.someOtherKey).toBe('kept');
  });

  it('replaces a stale (http-shaped) cleargate entry from 0.7.x', () => {
    const existing = {
      mcpServers: { cleargate: { type: 'http', url: 'https://cleargate-mcp.soula.ge/mcp' } },
    };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY_LATEST));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_LATEST);
  });

  it('idempotent: identical input → byte-equal output', () => {
    const a = mergeMcpJson(null, STDIO_ENTRY_LATEST);
    const b = mergeMcpJson(JSON.parse(a), STDIO_ENTRY_LATEST);
    expect(b).toBe(a);
  });
});

describe('injectMcpJson (filesystem)', () => {
  it('greenfield (no pin): returns "created" + writes stdio entry pinned to "latest"', () => {
    const action = injectMcpJson(tmpDir);
    expect(action).toBe('created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_LATEST);
    expect(parsed.mcpServers.cleargate.command).toBe('npx');
    expect(parsed.mcpServers.cleargate.args[1]).toBe('cleargate@latest');
  });

  it('greenfield with explicit pin: writes stdio entry with that version', () => {
    const action = injectMcpJson(tmpDir, '0.8.1');
    expect(action).toBe('created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_PINNED);
    expect(parsed.mcpServers.cleargate.args[1]).toBe('cleargate@0.8.1');
  });

  it('returns "unchanged" on second invocation with same pin', () => {
    injectMcpJson(tmpDir, '0.8.1');
    const second = injectMcpJson(tmpDir, '0.8.1');
    expect(second).toBe('unchanged');
  });

  it('returns "updated" when pin version differs (post-upgrade re-init)', () => {
    injectMcpJson(tmpDir, '0.8.0');
    const second = injectMcpJson(tmpDir, '0.8.1');
    expect(second).toBe('updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate.args[1]).toBe('cleargate@0.8.1');
  });

  it('returns "updated" when existing file has the older 0.7.x http entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify(
        { mcpServers: { cleargate: { type: 'http', url: 'https://cleargate-mcp.soula.ge/mcp' } } },
        null,
        2,
      ) + '\n',
    );
    const action = injectMcpJson(tmpDir);
    expect(action).toBe('updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_LATEST);
  });

  it('returns "updated" when existing file has the 0.8.0 cleargate-on-PATH entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify(
        { mcpServers: { cleargate: { command: 'cleargate', args: ['mcp', 'serve'] } } },
        null,
        2,
      ) + '\n',
    );
    const action = injectMcpJson(tmpDir, '0.8.1');
    expect(action).toBe('updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY_PINNED);
  });

  it('throws on malformed existing JSON (does not overwrite)', () => {
    fs.writeFileSync(path.join(tmpDir, '.mcp.json'), '{ this is not json');
    expect(() => injectMcpJson(tmpDir)).toThrow(/not valid JSON/);
    expect(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8')).toBe('{ this is not json');
  });
});
