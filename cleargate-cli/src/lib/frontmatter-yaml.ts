/**
 * Frontmatter YAML serializer backed by js-yaml with CORE_SCHEMA.
 *
 * Emits a `---\n<yaml>\n---` block. Preserves key insertion order (JS
 * objects iterate non-numeric keys in insertion order by spec, and js-yaml
 * follows Object.keys), nested maps, arrays, and native scalar types.
 *
 * Partner of parse-frontmatter.ts — the two round-trip losslessly.
 */

import yaml from 'js-yaml';

/**
 * Serialize a frontmatter record to a YAML block (including the --- delimiters).
 * Key order is preserved as supplied.
 */
export function serializeFrontmatter(fm: Record<string, unknown>): string {
  // Empty object → emit a two-delimiter block with no body
  if (Object.keys(fm).length === 0) {
    return '---\n---';
  }

  const yamlBody = yaml.dump(fm, {
    schema: yaml.CORE_SCHEMA,
    lineWidth: -1,
    noRefs: true,
    noCompatMode: true,
    quotingType: '"',
    forceQuotes: false,
  });

  // js-yaml always ends with \n; trim so we control the framing
  return `---\n${yamlBody.replace(/\n+$/, '')}\n---`;
}

/**
 * Format a Date as ISO 8601 UTC with second precision: "YYYY-MM-DDTHH:MM:SSZ"
 */
export function toIsoSecond(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
