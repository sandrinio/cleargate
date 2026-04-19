import { describe, it, expect } from 'vitest';
import type { ClaudeSettings } from '../../src/lib/settings-json-surgery.js';
import { removeClearGateHooks, hasClearGateHooks } from '../../src/lib/settings-json-surgery.js';

// ---- helpers ----------------------------------------------------------------

function cgSubagentStop(command = '/Users/foo/.claude/hooks/token-ledger.sh'): ClaudeSettings {
  return {
    hooks: {
      SubagentStop: [
        {
          hooks: [{ type: 'command', command }],
        },
      ],
    },
  };
}

function userSubagentStop(): ClaudeSettings['hooks'] {
  return {
    SubagentStop: [
      {
        hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
      },
    ],
  };
}

// ---- removeClearGateHooks ---------------------------------------------------

describe('removeClearGateHooks', () => {
  it('strips only ClearGate hooks, preserves user SubagentStop hook', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command:
                  'FILE=$(jq -r \'.tool_input.file_path\'); case "$FILE" in *.cleargate/delivery/*) node /usr/local/lib/node_modules/cleargate/dist/cli.js wiki ingest "$FILE" ;; esac',
              },
            ],
          },
        ],
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);

    // PostToolUse had only ClearGate hooks — should be gone
    expect(result.hooks?.PostToolUse).toBeUndefined();

    // User SubagentStop hook must remain
    expect(result.hooks?.SubagentStop).toBeDefined();
    expect(result.hooks?.SubagentStop).toHaveLength(1);
    expect(result.hooks!.SubagentStop![0].hooks![0].command).toBe('/Users/foo/my-custom-hook.sh');
  });

  it('preserves all other top-level keys', () => {
    const settings: ClaudeSettings = {
      other: { foo: 'bar' },
      hooks: {
        SubagentStop: [
          {
            hooks: [
              {
                type: 'command',
                command: '/Users/foo/.claude/hooks/token-ledger.sh',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    expect(result.other).toEqual({ foo: 'bar' });
  });

  it('is a no-op when no ClearGate hooks are present', () => {
    const settings: ClaudeSettings = {
      hooks: {
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/my-custom-hook.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    // Deep equality — no ClearGate hooks to remove, result mirrors input structure
    expect(JSON.stringify(result)).toBe(JSON.stringify(settings));
  });

  it('cleargate-*.sh wildcard catches future ClearGate hooks', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: '/Users/foo/.claude/hooks/cleargate-future.sh',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    expect(result.hooks?.PostToolUse).toBeUndefined();
  });

  it('removes empty PostToolUse array after last ClearGate entry is removed', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: '/Users/foo/.claude/hooks/token-ledger.sh' }],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    // Key must be deleted entirely (not set to [])
    expect(result.hooks?.PostToolUse).toBeUndefined();
  });

  it('removes only matching inner hooks when HookEntry mixes ClearGate + user commands', () => {
    const settings: ClaudeSettings = {
      hooks: {
        SubagentStop: [
          {
            hooks: [
              { type: 'command', command: '/Users/foo/.claude/hooks/token-ledger.sh' },
              { type: 'command', command: '/Users/foo/my-custom-hook.sh' },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    const entry = result.hooks?.SubagentStop?.[0];
    expect(entry).toBeDefined();
    expect(entry!.hooks).toHaveLength(1);
    expect(entry!.hooks![0].command).toBe('/Users/foo/my-custom-hook.sh');
  });

  it('matches stamp-and-gate.sh', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/stamp-and-gate.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  it('matches session-start.sh', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/session-start.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  it('matches wiki-ingest.sh (legacy)', () => {
    const settings = cgSubagentStop('/Users/foo/.claude/hooks/wiki-ingest.sh');
    expect(removeClearGateHooks(settings).hooks).toBeUndefined();
  });

  it('matches inline wiki ingest command (SPRINT-04 legacy PostToolUse)', () => {
    // This reproduces the actual .claude/settings.json inline command format
    const settings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command:
                  'FILE=$(jq -r \'.tool_input.file_path\'); case "$FILE" in *.cleargate/delivery/*) node /usr/local/dist/cli.js wiki ingest "$FILE" >> /path/to/log 2>&1 ;; esac',
              },
            ],
          },
        ],
      },
    };

    const result = removeClearGateHooks(settings);
    expect(result.hooks?.PostToolUse).toBeUndefined();
  });
});

// ---- hasClearGateHooks ------------------------------------------------------

describe('hasClearGateHooks', () => {
  it('returns true when a ClearGate hook is present', () => {
    const settings = cgSubagentStop();
    expect(hasClearGateHooks(settings)).toBe(true);
  });

  it('returns false when no ClearGate hooks are present', () => {
    const settings: ClaudeSettings = {
      hooks: userSubagentStop(),
    };
    expect(hasClearGateHooks(settings)).toBe(false);
  });

  it('returns false when hooks key is absent', () => {
    const settings: ClaudeSettings = { other: 'value' };
    expect(hasClearGateHooks(settings)).toBe(false);
  });
});
