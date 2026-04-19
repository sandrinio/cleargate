/**
 * YAML frontmatter parser backed by js-yaml with CORE_SCHEMA (YAML 1.2 core).
 *
 * Parses `---\n<yaml>\n---\n<body>` into a typed frontmatter map + body string.
 * Preserves native types (null, boolean, number, string), nested maps, and
 * arrays. Uses CORE_SCHEMA so ISO-8601 timestamp strings are NOT coerced to
 * Date objects (YAML 1.1's quirk).
 *
 * Historical note: an earlier hand-rolled parser flattened indented nested
 * maps into top-level keys and stringified null/boolean scalars. See
 * BUG-001 and FLASHCARD entry `#yaml #frontmatter`.
 */

import yaml from 'js-yaml';

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

  const yamlText = lines.slice(1, closeIdx).join('\n');
  const bodyLines = lines.slice(closeIdx + 1);
  // strip one leading blank line if present
  if (bodyLines[0] === '') bodyLines.shift();
  const body = bodyLines.join('\n');

  if (yamlText.trim() === '') {
    return { fm: {}, body };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText, { schema: yaml.CORE_SCHEMA });
  } catch (err) {
    throw new Error(`parseFrontmatter: invalid YAML: ${(err as Error).message}`);
  }

  if (parsed === null || parsed === undefined) {
    return { fm: {}, body };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('parseFrontmatter: frontmatter is not a YAML mapping');
  }

  return { fm: parsed as Record<string, unknown>, body };
}
