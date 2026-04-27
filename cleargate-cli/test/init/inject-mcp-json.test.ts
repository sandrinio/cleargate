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
  STDIO_ENTRY,
} from '../../src/init/inject-mcp-json.js';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-mcp-json-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('mergeMcpJson (pure)', () => {
  it('greenfield: produces object with stdio cleargate entry', () => {
    const out = mergeMcpJson(null, STDIO_ENTRY);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({ mcpServers: { cleargate: STDIO_ENTRY } });
    expect(out.endsWith('\n')).toBe(true);
  });

  it('preserves unrelated mcpServers entries', () => {
    const existing = { mcpServers: { other: { command: 'foo', args: ['bar'] } } };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY));
    expect(parsed.mcpServers.other).toEqual({ command: 'foo', args: ['bar'] });
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY);
  });

  it('preserves unrelated top-level keys', () => {
    const existing = { mcpServers: {}, someOtherKey: 'kept' } as Record<string, unknown>;
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY));
    expect(parsed.someOtherKey).toBe('kept');
  });

  it('replaces a stale (http-shaped) cleargate entry from 0.7.x', () => {
    const existing = {
      mcpServers: { cleargate: { type: 'http', url: 'https://cleargate-mcp.soula.ge/mcp' } },
    };
    const parsed = JSON.parse(mergeMcpJson(existing, STDIO_ENTRY));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY);
  });

  it('idempotent: identical input → byte-equal output', () => {
    const a = mergeMcpJson(null, STDIO_ENTRY);
    const b = mergeMcpJson(JSON.parse(a), STDIO_ENTRY);
    expect(b).toBe(a);
  });
});

describe('injectMcpJson (filesystem)', () => {
  it('greenfield: returns "created" + writes stdio entry', () => {
    const action = injectMcpJson(tmpDir);
    expect(action).toBe('created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY);
  });

  it('returns "unchanged" on second invocation', () => {
    injectMcpJson(tmpDir);
    const second = injectMcpJson(tmpDir);
    expect(second).toBe('unchanged');
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
    expect(parsed.mcpServers.cleargate).toEqual(STDIO_ENTRY);
  });

  it('throws on malformed existing JSON (does not overwrite)', () => {
    fs.writeFileSync(path.join(tmpDir, '.mcp.json'), '{ this is not json');
    expect(() => injectMcpJson(tmpDir)).toThrow(/not valid JSON/);
    expect(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8')).toBe('{ this is not json');
  });
});
