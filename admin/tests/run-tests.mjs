#!/usr/bin/env node
/**
 * run-tests.mjs — STORY-028-07
 *
 * Test runner wrapper for admin/ unit tests.
 * Excludes *.red.node.test.ts files (QA-Red files - immutable, contain vitest imports).
 * Passes all other *.node.test.ts files to node --test.
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNIT_DIR = path.join(__dirname, 'unit');

// Collect all *.node.test.ts files, excluding *.red.node.test.ts
function collectTestFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fp));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.node.test.ts') &&
      !entry.name.endsWith('.red.node.test.ts')
    ) {
      files.push(fp);
    }
  }
  return files;
}

const testFiles = collectTestFiles(UNIT_DIR);

const result = spawnSync(
  process.execPath,
  [
    '--conditions', 'browser',
    '--test',
    '--import', 'tsx',
    '--import', path.join(__dirname, 'setup-node-test.mjs'),
    '--test-concurrency=1',
    '--experimental-test-module-mocks',
    '--test-reporter=spec',
    ...testFiles,
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  }
);

process.exit(result.status ?? 1);
