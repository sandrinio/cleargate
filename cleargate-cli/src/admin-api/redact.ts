/**
 * Recursively replaces sensitive key values with '<redacted>'.
 * Used in debug log paths — never in success output.
 * Keys stripped: token, refresh_token, invite_token
 */
const SENSITIVE_KEYS = new Set(['token', 'refresh_token', 'invite_token']);

export function redactSensitive(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        result[key] = '<redacted>';
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }
  return obj;
}
