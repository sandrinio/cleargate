/**
 * inject-claude-md.ts — bounded-block injection for CLAUDE.md
 *
 * Block format: <!-- CLEARGATE:START -->\n<content>\n<!-- CLEARGATE:END -->
 * Detection regex: /<!-- CLEARGATE:START -->[\s\S]*<!-- CLEARGATE:END -->/  (greedy, see below)
 *
 * Rules:
 *   - If existing === null:  create file with block as full content (+ trailing newline)
 *   - If existing matches:   replace the bounded block in place (idempotent)
 *   - If existing no match:  append block with 2 leading newlines (preserve user content above)
 */

// Greedy match: from first <!-- CLEARGATE:START --> to LAST <!-- CLEARGATE:END -->.
// Greedy is correct here because:
//   (a) cleargate-planning/CLAUDE.md body text mentions both markers inline as code references,
//       and non-greedy would stop at the inline END before the real one.
//   (b) We assume at most one cleargate block per file (idempotency requires it).
const BLOCK_REGEX = /<!-- CLEARGATE:START -->[\s\S]*<!-- CLEARGATE:END -->/;

/**
 * Extract the bounded block from a source file (e.g. cleargate-planning/CLAUDE.md).
 * Returns the text from <!-- CLEARGATE:START --> to <!-- CLEARGATE:END --> inclusive.
 * Throws if the markers are not found.
 */
export function extractBlock(sourceContent: string): string {
  const match = BLOCK_REGEX.exec(sourceContent);
  if (!match) {
    throw new Error('inject-claude-md: CLEARGATE:START/END markers not found in source content');
  }
  return match[0];
}

/**
 * Inject or update the bounded block in an existing CLAUDE.md.
 *
 * @param existing - current content of CLAUDE.md, or null if file doesn't exist
 * @param block    - the full block to inject, from <!-- CLEARGATE:START --> to <!-- CLEARGATE:END --> inclusive
 * @returns        - new file content (ready to write)
 */
export function injectClaudeMd(existing: string | null, block: string): string {
  if (existing === null) {
    // Create new file with block as full content
    return block + '\n';
  }

  if (BLOCK_REGEX.test(existing)) {
    // Replace existing block in place
    return existing.replace(BLOCK_REGEX, block);
  }

  // Append block with 2 leading newlines
  return existing.trimEnd() + '\n\n' + block + '\n';
}
