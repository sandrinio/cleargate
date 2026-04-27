/**
 * inject-mcp-json.test.ts — BUG-017 unit coverage for `.mcp.json` merge.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mergeMcpJson, injectMcpJson } from '../../src/init/inject-mcp-json.js';

const URL = 'https://cleargate-mcp.soula.ge/mcp';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-mcp-json-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('mergeMcpJson (pure)', () => {
  it('greenfield: produces object with cleargate entry only', () => {
    const out = mergeMcpJson(null, { type: 'http', url: URL });
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({ mcpServers: { cleargate: { type: 'http', url: URL } } });
    expect(out.endsWith('\n')).toBe(true);
  });

  it('preserves unrelated mcpServers entries', () => {
    const existing = { mcpServers: { other: { command: 'foo', args: ['bar'] } } };
    const parsed = JSON.parse(mergeMcpJson(existing, { type: 'http', url: URL }));
    expect(parsed.mcpServers.other).toEqual({ command: 'foo', args: ['bar'] });
    expect(parsed.mcpServers.cleargate).toEqual({ type: 'http', url: URL });
  });

  it('preserves unrelated top-level keys', () => {
    const existing = { mcpServers: {}, someOtherKey: 'kept' } as Record<string, unknown>;
    const parsed = JSON.parse(mergeMcpJson(existing, { type: 'http', url: URL }));
    expect(parsed.someOtherKey).toBe('kept');
  });

  it('replaces a stale cleargate entry', () => {
    const existing = {
      mcpServers: { cleargate: { type: 'http', url: 'https://old.example.com/mcp' } },
    };
    const parsed = JSON.parse(mergeMcpJson(existing, { type: 'http', url: URL }));
    expect(parsed.mcpServers.cleargate.url).toBe(URL);
  });

  it('idempotent: identical input → byte-equal output', () => {
    const a = mergeMcpJson(null, { type: 'http', url: URL });
    const b = mergeMcpJson(JSON.parse(a), { type: 'http', url: URL });
    expect(b).toBe(a);
  });
});

describe('injectMcpJson (filesystem)', () => {
  it('greenfield: returns "created" + writes file', () => {
    const action = injectMcpJson(tmpDir, URL);
    expect(action).toBe('created');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate.url).toBe(URL);
  });

  it('returns "unchanged" on second invocation with same URL', () => {
    injectMcpJson(tmpDir, URL);
    const second = injectMcpJson(tmpDir, URL);
    expect(second).toBe('unchanged');
  });

  it('returns "updated" when existing file has different cleargate URL', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify(
        { mcpServers: { cleargate: { type: 'http', url: 'https://old.example/mcp' } } },
        null,
        2,
      ) + '\n',
    );
    const action = injectMcpJson(tmpDir, URL);
    expect(action).toBe('updated');
    const parsed = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    expect(parsed.mcpServers.cleargate.url).toBe(URL);
  });

  it('throws on malformed existing JSON (does not overwrite)', () => {
    fs.writeFileSync(path.join(tmpDir, '.mcp.json'), '{ this is not json');
    expect(() => injectMcpJson(tmpDir, URL)).toThrow(/not valid JSON/);
    // Unchanged on disk
    expect(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8')).toBe('{ this is not json');
  });
});
