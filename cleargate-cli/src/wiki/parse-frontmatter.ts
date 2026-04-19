/**
 * Inline YAML frontmatter parser — hand-rolled, ≤40 LoC.
 * Handles: `key: value`, quoted strings, `[a, b]` list literals.
 * Rejects nested YAML with a thrown Error.
 */

export function parseFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const lines = raw.split('\n');
  if (lines[0] !== '---') {
    throw new Error('parseFrontmatter: input does not start with ---');
  }
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) {
    throw new Error('parseFrontmatter: missing closing ---');
  }
  const fmLines = lines.slice(1, closeIdx);
  const bodyLines = lines.slice(closeIdx + 1);
  // strip one leading blank line if present
  if (bodyLines[0] === '') bodyLines.shift();

  const fm: Record<string, unknown> = {};
  for (const line of fmLines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    if (val === '' || val === '[]') { fm[key] = []; continue; }

    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      if (inner === '') { fm[key] = []; continue; }
      fm[key] = inner
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    if (val.startsWith('{')) {
      throw new Error(`parseFrontmatter: nested YAML objects not supported (key: ${key})`);
    }

    fm[key] = val.replace(/^["']|["']$/g, '');
  }

  return { fm, body: bodyLines.join('\n') };
}
