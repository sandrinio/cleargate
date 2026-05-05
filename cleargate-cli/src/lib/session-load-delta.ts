/**
 * session-load-delta.ts — CR-059
 *
 * Determines whether a file that Claude Code loads once per session
 * (`.claude/settings.json`, `.mcp.json`) has changed in a schema-meaningful
 * way that actually requires a session restart.
 *
 * Cosmetic-only changes (key reordering, whitespace drift) are suppressed.
 * The function is CONSERVATIVE: on any parse failure it returns `true` (warn).
 *
 * SDR-locked scope (approved 2026-05-05):
 *  - `.claude/settings.json`: only `hooks.{PreToolUse,PostToolUse,SessionStart,SubagentStop}` arrays matter.
 *  - `.mcp.json`: only `mcpServers.cleargate` entry matters.
 *  - All other paths in SESSION_LOAD_PATHS: return `true` (unknown format → warn).
 */

/**
 * Canonicalize a value for stable comparison by sorting object keys
 * recursively before JSON.stringify. Arrays are preserved in order (element
 * order in hook arrays IS meaningful — changing order IS a schema change).
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k]));
  return '{' + pairs.join(',') + '}';
}

type HooksBlock = Record<string, unknown>;
type SettingsJson = Record<string, unknown>;
type McpJson = Record<string, unknown>;

const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'SessionStart', 'SubagentStop'] as const;

/**
 * Extract only the schema-meaningful portion of `.claude/settings.json` for
 * comparison: the four hook event arrays (PreToolUse, PostToolUse,
 * SessionStart, SubagentStop). Other top-level keys are session-load-irrelevant.
 */
function extractSettingsHooksBlock(settings: SettingsJson): HooksBlock {
  const hooks = (settings['hooks'] as HooksBlock | undefined) ?? {};
  const extracted: HooksBlock = {};
  for (const event of HOOK_EVENTS) {
    if (Object.prototype.hasOwnProperty.call(hooks, event)) {
      extracted[event] = hooks[event];
    }
  }
  return extracted;
}

/**
 * Extract only the `mcpServers.cleargate` entry from `.mcp.json`.
 * Other server entries are user-managed; we don't own their restart semantics.
 */
function extractMcpCleargateEntry(mcp: McpJson): unknown {
  const servers = (mcp['mcpServers'] as Record<string, unknown> | undefined) ?? {};
  return servers['cleargate'] ?? null;
}

/**
 * Returns `true` iff the file at `filePath` has changed in a schema-meaningful
 * way between `oldContent` and `newContent` (i.e., a session restart is needed).
 * Returns `false` iff the change is cosmetic-only (suppress the restart warning).
 *
 * Conservative: on any parse failure returns `true` (when in doubt, warn).
 *
 * @param filePath  Repo-relative path, used to select the extraction strategy.
 * @param oldContent  UTF-8 string of the file before upgrade/init.
 * @param newContent  UTF-8 string of the file after upgrade/init.
 */
export function extractSessionLoadDelta(
  filePath: string,
  oldContent: string,
  newContent: string
): boolean {
  // Normalize the path to handle both .claude/settings.json and variants
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized === '.claude/settings.json') {
    try {
      const oldSettings = JSON.parse(oldContent) as SettingsJson;
      const newSettings = JSON.parse(newContent) as SettingsJson;
      const oldHooks = extractSettingsHooksBlock(oldSettings);
      const newHooks = extractSettingsHooksBlock(newSettings);
      return canonicalize(oldHooks) !== canonicalize(newHooks);
    } catch {
      // Parse failure — conservative: warn
      return true;
    }
  }

  if (normalized === '.mcp.json') {
    try {
      const oldMcp = JSON.parse(oldContent) as McpJson;
      const newMcp = JSON.parse(newContent) as McpJson;
      const oldEntry = extractMcpCleargateEntry(oldMcp);
      const newEntry = extractMcpCleargateEntry(newMcp);
      return canonicalize(oldEntry) !== canonicalize(newEntry);
    } catch {
      // Parse failure — conservative: warn
      return true;
    }
  }

  // Unknown SESSION_LOAD_PATHS path — conservative: warn
  return true;
}
