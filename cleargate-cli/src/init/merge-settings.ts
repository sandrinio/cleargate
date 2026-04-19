/**
 * merge-settings.ts — JSON merge for .claude/settings.json
 *
 * Algorithm (from M4 blueprint):
 *   - if existing is null: return addition
 *   - otherwise deep-clone existing and merge addition.hooks into result.hooks
 *   - For each event (e.g. PostToolUse):
 *     - find matching entry by `matcher` field
 *     - if absent: push entire new entry
 *     - if present: de-dup merge inner hooks[] by exact `command` string match
 *   - Preserves all other top-level keys (SubagentStop, permissions, etc.)
 */

export interface HookCommand {
  type: string;
  command: string;
}

export interface HookEntry {
  matcher?: string;
  hooks?: HookCommand[];
  [key: string]: unknown;
}

export interface HooksConfig {
  [event: string]: HookEntry[];
}

export interface SettingsJson {
  hooks?: HooksConfig;
  [key: string]: unknown;
}

/**
 * Deep-clone a plain JSON-serializable object.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Merge `addition` hook config into `existing` settings.
 * Returns a new merged object; does not mutate either argument.
 *
 * @param existing - parsed .claude/settings.json content, or null if file absent
 * @param addition - the hook config to merge in (must have `hooks` key)
 */
export function mergeSettings(
  existing: SettingsJson | null,
  addition: SettingsJson,
): SettingsJson {
  if (existing === null) {
    return deepClone(addition);
  }

  const result: SettingsJson = deepClone(existing);

  // Ensure result.hooks exists
  if (!result.hooks) {
    result.hooks = {};
  }

  // Merge each event from addition
  for (const [eventName, eventArray] of Object.entries(addition.hooks ?? {})) {
    if (!result.hooks[eventName]) {
      result.hooks[eventName] = [];
    }

    for (const newEntry of eventArray) {
      const matchingIdx = result.hooks[eventName].findIndex(
        (e) => e.matcher === newEntry.matcher,
      );

      if (matchingIdx === -1) {
        // No matching entry — push entire new entry
        result.hooks[eventName].push(deepClone(newEntry));
      } else {
        // Matcher exists — merge inner hooks[] by de-dup on `command`
        const existingEntry = result.hooks[eventName][matchingIdx];
        const existingInner: HookCommand[] = Array.isArray(existingEntry.hooks)
          ? (existingEntry.hooks as HookCommand[])
          : [];

        for (const newInner of newEntry.hooks ?? []) {
          if (!existingInner.some((h) => h.command === newInner.command)) {
            existingInner.push(deepClone(newInner) as HookCommand);
          }
        }

        result.hooks[eventName][matchingIdx] = {
          ...existingEntry,
          hooks: existingInner,
        };
      }
    }
  }

  return result;
}
