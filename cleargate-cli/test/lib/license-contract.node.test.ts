import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * STORY-018-01: LICENSE (MIT) contract tests
 * Four scenarios matching Gherkin §2.1
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve the repo root relative to this test file location:
// cleargate-cli/test/lib/ -> cleargate-cli/ -> repo root
const repoRoot = path.resolve(__dirname, '../../..');
const rootLicense = path.join(repoRoot, 'LICENSE');
const cliLicense = path.join(repoRoot, 'cleargate-cli', 'LICENSE');
const cliPackageJson = path.join(repoRoot, 'cleargate-cli', 'package.json');

describe('LICENSE contract (STORY-018-01)', () => {
  test('Scenario: Root LICENSE present — first non-empty line is "MIT License" and contains correct copyright', () => {
    const contents = fs.readFileSync(rootLicense, 'utf-8');
    const lines = contents.split('\n');

    // Find first non-empty line
    const firstNonEmpty = lines.find(l => l.trim() !== '');
    assert.strictEqual(firstNonEmpty, 'MIT License');

    // Must contain correct copyright
    assert.ok(String(contents).includes('Copyright (c) 2026 Sandro Suladze'));
  });

  test('Scenario: CLI package LICENSE matches — byte-identical to root LICENSE', () => {
    const rootContents = fs.readFileSync(rootLicense, 'utf-8');
    const cliContents = fs.readFileSync(cliLicense, 'utf-8');
    assert.strictEqual(cliContents, rootContents);
  });

  test('Scenario: npm tarball ships LICENSE — package.json license field is "MIT" and files array includes "LICENSE"', () => {
    const pkg = JSON.parse(fs.readFileSync(cliPackageJson, 'utf-8'));
    assert.strictEqual(pkg.license, 'MIT');
    assert.ok(String(pkg.files).includes('LICENSE'));
  });

  test('Scenario: npm pack includes LICENSE — dry-run output lists LICENSE', () => {
    const output = execSync(
      'npm pack --workspace=cleargate-cli --dry-run 2>&1',
      { cwd: repoRoot, encoding: 'utf-8' },
    );
    assert.match(String(output), /LICENSE/);
  });
});
