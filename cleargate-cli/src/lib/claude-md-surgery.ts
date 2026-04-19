export const CLEARGATE_START = '<!-- CLEARGATE:START -->';
export const CLEARGATE_END = '<!-- CLEARGATE:END -->';

// IMPORTANT: regex MUST be GREEDY ([\s\S]* not [\s\S]*?)
// The block body itself may reference both markers in prose (FLASHCARD 2026-04-19 #init #inject-claude-md #regex).
// Non-greedy would stop at the first inline END marker in prose, cutting off the real block.
const BLOCK_REGEX = /<!-- CLEARGATE:START -->([\s\S]*)<!-- CLEARGATE:END -->/;

/**
 * Returns the content between CLEARGATE:START and CLEARGATE:END markers.
 * Returns null if either marker is missing.
 */
export function readBlock(content: string): string | null {
  const match = BLOCK_REGEX.exec(content);
  if (!match) return null;
  return match[1];
}

/**
 * Replaces the content between CLEARGATE:START and CLEARGATE:END markers,
 * preserving the markers themselves and all surrounding content.
 * Throws if markers are missing.
 */
export function writeBlock(content: string, newBlockBody: string): string {
  if (!content.includes(CLEARGATE_START)) {
    throw new Error('CLAUDE.md is missing <!-- CLEARGATE:START --> marker');
  }
  if (!content.includes(CLEARGATE_END)) {
    throw new Error('CLAUDE.md is missing <!-- CLEARGATE:END --> marker');
  }
  return content.replace(BLOCK_REGEX, `${CLEARGATE_START}${newBlockBody}${CLEARGATE_END}`);
}

/**
 * Removes both markers AND the content between them, leaving surrounding content intact.
 * Throws if markers are missing.
 */
export function removeBlock(content: string): string {
  if (!content.includes(CLEARGATE_START)) {
    throw new Error('CLAUDE.md is missing <!-- CLEARGATE:START --> marker');
  }
  if (!content.includes(CLEARGATE_END)) {
    throw new Error('CLAUDE.md is missing <!-- CLEARGATE:END --> marker');
  }
  return content.replace(BLOCK_REGEX, '');
}
