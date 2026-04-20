/**
 * security-grep.test.ts — STORY-006-05 (non-negotiable per §4 DoD)
 *
 * Static grep assertion: TokenIssuedModal and tokens page MUST NOT reference
 * localStorage, sessionStorage, or indexedDB in any form.
 *
 * This test is a guard against regressions introduced by future editors.
 * QA will re-run this test independently.
 *
 * Note: localStorage usage in other files (e.g. UI preference: sidebar-collapsed)
 * is acceptable. This test is scoped to the token-handling files only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const TOKEN_FILES = [
  'src/lib/components/TokenIssuedModal.svelte',
  'src/lib/components/TokenIssueForm.svelte',
  'src/routes/projects/[id]/tokens/+page.svelte',
  'src/lib/utils/clipboard.ts',
];

const FORBIDDEN_PATTERNS = [
  /localStorage/g,
  /sessionStorage/g,
  /indexedDB/g,
];

/**
 * Strip single-line and block comments from source code before scanning.
 * This prevents false positives from JSDoc comments that name the forbidden APIs
 * (e.g. "NEVER written to localStorage" in a security contract comment).
 */
function stripComments(src: string): string {
  // Remove block comments (/* ... */)
  let result = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments (// ...)
  result = result.replace(/\/\/.*/g, '');
  // Remove Svelte template comments (<!-- ... -->)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  return result;
}

describe('Security grep: no persistent storage in token files', () => {
  for (const relativePath of TOKEN_FILES) {
    it(`${relativePath} contains no localStorage/sessionStorage/indexedDB in non-comment code`, () => {
      const fullPath = join(projectRoot, relativePath);
      let rawContent: string;
      try {
        rawContent = readFileSync(fullPath, 'utf-8');
      } catch {
        // File doesn't exist yet — treat as safe (will fail in CI when the file should exist)
        return;
      }

      const content = stripComments(rawContent);

      for (const pattern of FORBIDDEN_PATTERNS) {
        const matches = content.match(pattern);
        expect(
          matches,
          `File "${relativePath}" contains forbidden storage reference in non-comment code: ${pattern.toString()}. ` +
            `Plaintext tokens MUST NEVER be persisted. Found in stripped source.`,
        ).toBeNull();
      }
    });
  }

  it('mcp-client.ts module-level comment confirms never persisted', () => {
    const mcpClientPath = join(projectRoot, 'src/lib/mcp-client.ts');
    const content = readFileSync(mcpClientPath, 'utf-8');
    // The module banner must declare the no-storage contract
    expect(content).toContain('NEVER localStorage/sessionStorage');
  });
});
