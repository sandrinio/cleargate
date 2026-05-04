/**
 * script-incident.ts — Typed schema for run_script.sh incident JSON files.
 *
 * When the run_script.sh wrapper detects a non-zero exit from the wrapped command,
 * it writes a JSON file matching this interface to:
 *   .cleargate/sprint-runs/<sprint-id>/.script-incidents/<ts>-<hash>.json
 *
 * Reporter aggregates these files across agent dispatches and surfaces patterns
 * in REPORT.md §Risks Materialized.
 *
 * See: CR-046, M1 plan §CR-046 §JSON schema.
 */

/**
 * Maximum number of **bytes** captured from stdout or stderr.
 *
 * run_script.sh uses `head -c $MAX_STREAM_BYTES` (POSIX byte-count), NOT a
 * bash `${var:0:N}` char-index slice. For ASCII input these are equivalent;
 * for UTF-8 multi-byte input (e.g. cyrillic, CJK, emoji) byte-count is correct
 * and char-index is not — 4096 cyrillic chars × 2 bytes/char = 8192 bytes, which
 * would exceed the intended 4096-byte cap.
 *
 * Trade-off: `head -c` truncation may split a multi-byte character at the byte
 * boundary. The resulting partial UTF-8 sequence is valid for downstream
 * JSON.stringify — Node.js escapes incomplete sequences, producing valid JSON
 * that round-trips through JSON.parse without error. The stream content is
 * diagnostic-only; cosmetic partial-char at the truncation boundary is acceptable.
 *
 * Total field byte-length when truncated: MAX_STREAM_BYTES + Buffer.byteLength(TRUNCATION_SUFFIX)
 * ≈ 4096 + 15 = 4111 bytes (all ASCII suffix chars).
 */
export const MAX_STREAM_BYTES = 4096;

/**
 * Suffix appended to truncated stream content to signal the truncation.
 * Contains only ASCII characters; Buffer.byteLength(TRUNCATION_SUFFIX) === TRUNCATION_SUFFIX.length.
 */
export const TRUNCATION_SUFFIX = '... [truncated]';

/**
 * Structured record of a script invocation failure captured by run_script.sh.
 *
 * All fields are required (never undefined). String | null fields are null
 * when the corresponding env var was absent at invocation time.
 */
export interface ScriptIncident {
  /**
   * ISO-8601 UTC timestamp of the invocation (e.g. "2026-05-04T12:34:56Z").
   */
  ts: string;

  /**
   * The executable that was invoked (e.g. "node", "bash", "sh").
   */
  command: string;

  /**
   * Arguments passed to the command (not including the command itself).
   */
  args: string[];

  /**
   * Working directory at the time of invocation (absolute path).
   */
  cwd: string;

  /**
   * Non-zero exit code from the wrapped command.
   */
  exit_code: number;

  /**
   * First MAX_STREAM_BYTES bytes of captured stdout.
   * Ends with TRUNCATION_SUFFIX if the original output exceeded the limit.
   */
  stdout: string;

  /**
   * First MAX_STREAM_BYTES bytes of captured stderr.
   * Ends with TRUNCATION_SUFFIX if the original output exceeded the limit.
   */
  stderr: string;

  /**
   * Value of the AGENT_TYPE env var at invocation time, or null if absent.
   * Expected values: "developer" | "qa" | "architect" | "devops" | "reporter"
   */
  agent_type: string | null;

  /**
   * Value of the WORK_ITEM_ID env var at invocation time, or null if absent.
   * Examples: "CR-046", "STORY-023-01", "BUG-012"
   */
  work_item_id: string | null;
}

/**
 * Type guard: returns true when the given value satisfies the ScriptIncident shape.
 * Useful for validating parsed JSON at runtime.
 */
export function isScriptIncident(value: unknown): value is ScriptIncident {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['ts'] === 'string' &&
    typeof v['command'] === 'string' &&
    Array.isArray(v['args']) &&
    (v['args'] as unknown[]).every((a) => typeof a === 'string') &&
    typeof v['cwd'] === 'string' &&
    typeof v['exit_code'] === 'number' &&
    typeof v['stdout'] === 'string' &&
    typeof v['stderr'] === 'string' &&
    (typeof v['agent_type'] === 'string' || v['agent_type'] === null) &&
    (typeof v['work_item_id'] === 'string' || v['work_item_id'] === null)
  );
}
