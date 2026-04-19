export interface HookCommand {
  type: 'command';
  command: string;
  if?: string;
}

export interface HookEntry {
  matcher?: string;
  hooks?: HookCommand[];
}

export interface ClaudeSettings {
  hooks?: {
    PostToolUse?: HookEntry[];
    SessionStart?: HookEntry[];
    SubagentStop?: HookEntry[];
    [k: string]: HookEntry[] | undefined;
  };
  [k: string]: unknown;
}

/**
 * Returns true if the given command string belongs to ClearGate.
 * Matches:
 *   - .claude/hooks/token-ledger.sh
 *   - .claude/hooks/stamp-and-gate.sh
 *   - .claude/hooks/session-start.sh
 *   - .claude/hooks/wiki-ingest.sh (legacy)
 *   - .claude/hooks/cleargate-*.sh (catch-all for future hooks)
 *   - inline commands containing 'wiki ingest' (legacy SPRINT-04 PostToolUse inline)
 */
function isClearGateCommand(command: string): boolean {
  if (command.includes('wiki ingest')) return true;
  return /\/\.claude\/hooks\/(token-ledger|stamp-and-gate|session-start|wiki-ingest|cleargate-[^/]*)\.sh/.test(command);
}

/**
 * Removes ClearGate-owned hook entries from a ClaudeSettings object.
 * - Removes individual inner `hooks[]` sub-entries whose `command` matches ClearGate patterns.
 * - If the parent HookEntry's `hooks[]` array becomes empty, removes that HookEntry.
 * - If an event-category array (e.g. hooks.PostToolUse) becomes empty, removes the key.
 * - Preserves all other hook entries and all other top-level keys.
 */
export function removeClearGateHooks(settings: ClaudeSettings): ClaudeSettings {
  if (!settings.hooks) return { ...settings };

  const newHooks: NonNullable<ClaudeSettings['hooks']> = {};

  for (const [eventName, entries] of Object.entries(settings.hooks)) {
    if (!entries) continue;

    const filteredEntries: HookEntry[] = [];

    for (const entry of entries) {
      if (!entry.hooks || entry.hooks.length === 0) {
        // No inner hooks — keep as-is (not a ClearGate entry)
        filteredEntries.push(entry);
        continue;
      }

      const remainingInnerHooks = entry.hooks.filter(
        (h) => !isClearGateCommand(h.command)
      );

      if (remainingInnerHooks.length === 0) {
        // All inner hooks were ClearGate — drop this HookEntry entirely
        continue;
      }

      if (remainingInnerHooks.length === entry.hooks.length) {
        // No change — keep original entry reference
        filteredEntries.push(entry);
      } else {
        // Some removed — keep entry with remaining inner hooks
        filteredEntries.push({ ...entry, hooks: remainingInnerHooks });
      }
    }

    if (filteredEntries.length > 0) {
      newHooks[eventName] = filteredEntries;
    }
    // If filteredEntries is empty, skip the key entirely
  }

  const result: ClaudeSettings = { ...settings };

  if (Object.keys(newHooks).length > 0) {
    result.hooks = newHooks;
  } else {
    delete result.hooks;
  }

  return result;
}

/**
 * Returns true if settings contains any ClearGate-owned hook entries.
 */
export function hasClearGateHooks(settings: ClaudeSettings): boolean {
  if (!settings.hooks) return false;

  for (const entries of Object.values(settings.hooks)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (!entry.hooks) continue;
      for (const h of entry.hooks) {
        if (isClearGateCommand(h.command)) return true;
      }
    }
  }

  return false;
}
