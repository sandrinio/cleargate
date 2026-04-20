/**
 * url-state.ts — audit filter URL serialisation / deserialisation — STORY-006-07
 *
 * Pure functions; no SvelteKit imports so they can be unit-tested in jsdom.
 *
 * AuditFilters wire format (query params):
 *   from    ISO-8601 UTC datetime (optional)
 *   to      ISO-8601 UTC datetime (optional)
 *   user    member UUID (optional)
 *   tool    tool name string (optional)
 *   cursor  opaque base64url string (optional)
 */

export interface AuditFilters {
  from: string | null;
  to: string | null;
  /** member_id UUID — sent to API as ?user=<uuid> */
  user: string | null;
  tool: string | null;
  cursor: string | null;
}

/** Parse URLSearchParams into AuditFilters. Unknown params are ignored. */
export function parseFilters(params: URLSearchParams): AuditFilters {
  return {
    from: params.get('from'),
    to: params.get('to'),
    user: params.get('user'),
    tool: params.get('tool'),
    cursor: params.get('cursor'),
  };
}

/**
 * Serialise AuditFilters back to URLSearchParams.
 * Null/empty values are omitted so the URL stays clean.
 */
export function filtersToParams(filters: AuditFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.user) p.set('user', filters.user);
  if (filters.tool) p.set('tool', filters.tool);
  if (filters.cursor) p.set('cursor', filters.cursor);
  return p;
}

/** Build default filters: from = 7 days ago (UTC), to = now (UTC), rest null. */
export function defaultFilters(now: Date = new Date()): AuditFilters {
  const to = now.toISOString();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to, user: null, tool: null, cursor: null };
}

/**
 * Apply 30-day clamp: if (to - from) > 30 days, set from = to - 30d.
 * Returns a new filters object; does NOT mutate input.
 * Returns `clamped: true` flag so the UI can show the warning hint.
 */
export function clamp30d(filters: AuditFilters): { filters: AuditFilters; clamped: boolean } {
  if (!filters.from || !filters.to) return { filters, clamped: false };
  const fromMs = new Date(filters.from).getTime();
  const toMs = new Date(filters.to).getTime();
  const maxWindow = 30 * 24 * 60 * 60 * 1000;
  if (toMs - fromMs > maxWindow) {
    return {
      filters: {
        ...filters,
        from: new Date(toMs - maxWindow).toISOString(),
      },
      clamped: true,
    };
  }
  return { filters, clamped: false };
}

/** Build audit query string from filters (for appending to the path). */
export function buildAuditQueryString(filters: AuditFilters): string {
  const p = filtersToParams(filters);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}
