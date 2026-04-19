/**
 * Tiny Mustache-lite template renderer.
 * Supports:
 *   {{var}}              — variable substitution (missing → empty string)
 *   {{#section}}...{{/section}} — array iteration; inner {{field}} resolves
 *                                 against the current array element
 *
 * Anything more complex throws an Error.
 * No external dependencies.
 */

/** Render a template string with the given data context. */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  // Validate: no nested sections or unsupported tags
  // We only support {{var}}, {{#section}}...{{/section}}
  const tagRe = /\{\{([^}]+)\}\}/g;
  const matches = [...template.matchAll(tagRe)].map((m) => m[1].trim());
  for (const tag of matches) {
    if (tag.startsWith('^') || tag.startsWith('>') || tag.startsWith('!') || tag.startsWith('=')) {
      throw new Error(`renderTemplate: unsupported tag type: {{${tag}}}`);
    }
  }

  return renderSection(template, data);
}

function renderSection(template: string, ctx: Record<string, unknown>): string {
  // Process {{#section}}...{{/section}} blocks first
  const sectionRe = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

  let result = template.replace(sectionRe, (_match, key: string, inner: string) => {
    const val = ctx[key];
    if (!Array.isArray(val)) {
      // Non-array truthy: render inner once with same ctx; falsy: skip
      if (!val) return '';
      return renderSection(inner, ctx);
    }
    if (val.length === 0) return '';
    return val
      .map((item: unknown) => {
        const itemCtx =
          item !== null && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : { '.': item };
        return renderSection(inner, itemCtx);
      })
      .join('');
  });

  // Then substitute remaining {{var}} tokens
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = ctx[key];
    if (val === undefined || val === null) return '';
    return String(val);
  });

  return result;
}
