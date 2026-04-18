import { mkdtempSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadConfig, requireMcpUrl } from '../src/config.js';

function makeTmpConfig(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-config-'));
  const filePath = path.join(dir, 'config.json');
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('Config Loader', () => {
  // Test 1: Flag wins over env
  it('Scenario 1: flag mcpUrl wins over env CLEARGATE_MCP_URL', () => {
    const cfg = loadConfig({
      flags: { mcpUrl: 'https://flag.example' },
      env: { CLEARGATE_MCP_URL: 'https://env.example' },
    });
    expect(cfg.mcpUrl).toBe('https://flag.example');
  });

  // Test 2: Env wins over file
  it('Scenario 2: env CLEARGATE_MCP_URL wins over config file mcpUrl', () => {
    const configPath = makeTmpConfig(JSON.stringify({ mcpUrl: 'https://file.example' }));
    const cfg = loadConfig({
      env: { CLEARGATE_MCP_URL: 'https://env.example' },
      configPath,
    });
    expect(cfg.mcpUrl).toBe('https://env.example');
  });

  // Test 3: File wins over defaults
  it('Scenario 3: config file profile wins over default', () => {
    const configPath = makeTmpConfig(JSON.stringify({ profile: 'prod' }));
    const cfg = loadConfig({ env: {}, configPath });
    expect(cfg.profile).toBe('prod');
  });

  // Test 4: Defaults apply when nothing set
  it('Scenario 4: defaults apply when nothing is set', () => {
    const cfg = loadConfig({
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    expect(cfg.profile).toBe('default');
    expect(cfg.logLevel).toBe('info');
    expect(cfg.mcpUrl).toBeUndefined();
  });

  // Test 5: Missing config file is not an error
  it('Scenario 5: missing config file returns defaults without throwing', () => {
    expect(() =>
      loadConfig({ env: {}, configPath: '/nonexistent/path/x.json' }),
    ).not.toThrow();
    const cfg = loadConfig({ env: {}, configPath: '/nonexistent/path/x.json' });
    expect(cfg.profile).toBe('default');
    expect(cfg.logLevel).toBe('info');
  });

  // Test 6: Malformed JSON throws with path in message
  it('Scenario 6: malformed JSON in config file throws with file path in message', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-config-'));
    const configPath = path.join(dir, 'config.json');
    writeFileSync(configPath, '{', 'utf8');
    expect(() => loadConfig({ env: {}, configPath })).toThrow(configPath);
  });

  // Test 7: Unknown key in file throws (zod strict)
  it('Scenario 7: unknown key in config file throws zod strict error', () => {
    const configPath = makeTmpConfig(
      JSON.stringify({ mcpUrl: 'https://x.example', unknown: 1 }),
    );
    expect(() => loadConfig({ env: {}, configPath })).toThrow();
  });

  // Test 8: Invalid mcpUrl (not a URL) in file throws with field path
  it('Scenario 8: invalid mcpUrl in config file throws zod validation error', () => {
    const configPath = makeTmpConfig(JSON.stringify({ mcpUrl: 'not-a-url' }));
    expect(() => loadConfig({ env: {}, configPath })).toThrow();
  });

  // Test 9: Invalid logLevel in env throws
  it('Scenario 9: invalid CLEARGATE_LOG_LEVEL in env throws validation error', () => {
    expect(() =>
      loadConfig({
        env: { CLEARGATE_LOG_LEVEL: 'verbose' },
        configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
      }),
    ).toThrow();
  });

  // Test 10: requireMcpUrl throws when mcpUrl is undefined
  it('Scenario 10: requireMcpUrl throws exact message when mcpUrl not configured', () => {
    const cfg = loadConfig({
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    expect(() => requireMcpUrl(cfg)).toThrow(
      'mcpUrl not configured. Run `cleargate join <invite-url>` first.',
    );
  });

  // Test 11: requireMcpUrl returns the string when mcpUrl is set
  it('Scenario 11: requireMcpUrl returns mcpUrl string when configured', () => {
    const cfg = loadConfig({
      flags: { mcpUrl: 'https://mcp.example' },
      env: {},
      configPath: path.join(os.tmpdir(), 'cleargate-nonexistent-12345.json'),
    });
    expect(requireMcpUrl(cfg)).toBe('https://mcp.example');
  });
});
