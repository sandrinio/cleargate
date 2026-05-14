#!/usr/bin/env node
/**
 * ci-no-pm-sdk.mjs — CI enforcement: no PM-tool SDK imports in cleargate-cli or .claude
 *
 * Greps cleargate-cli/src/**\/*.ts and .claude/**\/*.{ts,sh,md} for forbidden PM-tool SDK
 * import statements. Exits 1 with a descriptive message on any match; exits 0 on a clean tree.
 *
 * Forbidden patterns (add new ones here to extend coverage):
 *   @linear/sdk, jira-client, azure-devops, @atlassian/, linear-sdk, node-jira-client, jira.js
 *
 * Why this rule exists: PM-tool adapters live exclusively in mcp/src/adapters/. The CLI and
 * agent-definition surfaces (.claude/) must remain PM-tool-agnostic so ClearGate can support
 * any PM tool without forking the core. See cleargate-protocol.md §Codebase/PM-Tool Boundary.
 *
 * Usage:
 *   node scripts/ci-no-pm-sdk.mjs
 *   npm run check:no-pm-sdk
 */

import { readFileSync, globSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Use cwd as the repo root so `npm run check:no-pm-sdk` works from any script location.
// Tests may override via CG_SDK_CHECK_ROOT env to run against fixture directories.
const REPO_ROOT = resolve(process.env['CG_SDK_CHECK_ROOT'] ?? process.cwd());

/** Forbidden PM-tool SDK patterns — substring match in import/require statements */
const PATTERNS = [
  '@linear/sdk',
  'jira-client',
  'azure-devops',
  '@atlassian/',
  'linear-sdk',
  'node-jira-client',
  'jira.js',
];

/** Glob the two surfaces that must remain PM-tool-SDK-free */
const files = globSync(
  ['cleargate-cli/src/**/*.ts', '.claude/**/*.{ts,sh,md}'],
  { cwd: REPO_ROOT }
);

let hits = 0;

/** Track whether we are inside a block comment */
let inBlockComment = false;

for (const relFile of files) {
  const absFile = join(REPO_ROOT, relFile);
  let content;
  try {
    content = readFileSync(absFile, 'utf8');
  } catch {
    // File unreadable (e.g. dangling symlink) — skip silently
    continue;
  }

  const lines = content.split('\n');
  inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comment boundaries
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    // Skip single-line comments and shell comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    for (const pattern of PATTERNS) {
      // Escape the pattern for use in regex (handles @, /, .)
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match import/require statements only (not free-form string literals)
      const importRe = new RegExp(
        `^\\s*(import|export)\\s+[\\s\\S]*?from\\s+['"][^'"]*${escaped}|` +
        `^\\s*import\\s+['"][^'"]*${escaped}|` +
        `^\\s*(const|let|var)\\s+\\S+\\s*=\\s*require\\(['"][^'"]*${escaped}`,
      );
      if (importRe.test(line)) {
        console.log(
          `❌ ${relFile}:${i + 1}: forbidden import '${pattern}' — see cleargate-protocol.md §Codebase/PM-Tool Boundary`,
        );
        hits++;
      }
    }
  }
}

if (hits === 0) {
  console.log('✓ no forbidden PM-SDK imports');
  process.exit(0);
}

process.exit(1);
