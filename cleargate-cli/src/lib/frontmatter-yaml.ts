/**
 * Shared frontmatter YAML serializer.
 * Extracted from stamp-frontmatter.ts so that frontmatter-cache.ts (STORY-008-02)
 * and stamp-tokens.ts (STORY-008-05) can reuse without duplication.
 *
 * Supported value types: string | null | boolean | number | string[] | opaque-object-string.
 * Preserves the given key order exactly.
 */

/**
 * Serialize a frontmatter record to a YAML block (including the --- delimiters).
 * Key order is preserved as supplied.
 */
export function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(fm)) {
    if (val === null) {
      lines.push(`${key}: null`);
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        const items = val.map((v) => `"${String(v)}"`).join(', ');
        lines.push(`${key}: [${items}]`);
      }
    } else {
      // string (possibly an opaque nested-object string like `{input: 100, ...}`)
      const s = String(val);
      // Opaque object strings (start with `{`) — emit verbatim, no extra quoting
      if (s.startsWith('{')) {
        lines.push(`${key}: ${s}`);
      } else {
        // Quote if the value looks like it needs quoting
        const needsQuotes =
          /[:#\[\]{}&*!|>'"%@`\n]/.test(s) ||
          s.trim() !== s ||
          s === '' ||
          s === 'null' ||
          s === 'true' ||
          s === 'false';
        if (needsQuotes) {
          lines.push(`${key}: "${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}: ${s}`);
        }
      }
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Format a Date as ISO 8601 UTC with second precision: "YYYY-MM-DDTHH:MM:SSZ"
 * Matches stamp-frontmatter.ts toIsoSecond convention.
 */
export function toIsoSecond(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
