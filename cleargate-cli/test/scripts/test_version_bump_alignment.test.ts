/**
 * test_version_bump_alignment.test.ts — STORY-014-02
 *
 * Gherkin Scenario: Three-way version bump lands atomically
 *   Given the pre-014-02 versions are cleargate-cli@0.5.0 / MANIFEST@0.5.0 / mcp@0.1.0
 *   When the close-out commit runs
 *   Then `cleargate-cli/package.json` reports `"version": "0.6.0"`
 *   And `cleargate-planning/MANIFEST.json` reports `"cleargate_version": "0.6.0"`
 *   And `mcp/package.json` reports `"version": "0.2.0"`
 *   And all three changes are in the same commit (no partial bump)
 *
 * R-11 protection: this test guards against partial version bumps.
 * All three values must match expected targets simultaneously.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const CLI_PKG_JSON = path.join(REPO_ROOT, 'cleargate-cli', 'package.json');
const MANIFEST_JSON = path.join(REPO_ROOT, 'cleargate-planning', 'MANIFEST.json');
const MCP_PKG_JSON = path.join(REPO_ROOT, 'mcp', 'package.json');

describe('STORY-014-02: Three-way version bump atomicity (R-11)', () => {
  it('cleargate-cli/package.json version is 0.6.0', () => {
    const pkg = JSON.parse(fs.readFileSync(CLI_PKG_JSON, 'utf-8')) as { version: string };
    expect(pkg.version).toBe('0.6.0');
  });

  it('cleargate-planning/MANIFEST.json cleargate_version is 0.6.0', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf-8')) as {
      cleargate_version: string;
    };
    expect(manifest.cleargate_version).toBe('0.6.0');
  });

  it('mcp/package.json version is 0.2.0', () => {
    const pkg = JSON.parse(fs.readFileSync(MCP_PKG_JSON, 'utf-8')) as { version: string };
    expect(pkg.version).toBe('0.2.0');
  });

  it('all three version values match expected targets simultaneously (R-11 atomicity guard)', () => {
    const cliPkg = JSON.parse(fs.readFileSync(CLI_PKG_JSON, 'utf-8')) as { version: string };
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf-8')) as {
      cleargate_version: string;
    };
    const mcpPkg = JSON.parse(fs.readFileSync(MCP_PKG_JSON, 'utf-8')) as { version: string };

    const allMatch =
      cliPkg.version === '0.6.0' &&
      manifest.cleargate_version === '0.6.0' &&
      mcpPkg.version === '0.2.0';

    expect(allMatch).toBe(true);
  });
});
