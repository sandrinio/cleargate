---
cr_id: CR-059
parent_ref: EPIC-016
parent_cleargate_id: EPIC-016
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_at: 2026-05-05T08:40:00Z
approved_by: sandrinio
created_at: 2026-05-05T08:00:00Z
updated_at: 2026-05-05T08:00:00Z
created_at_version: cleargate@0.11.3
updated_at_version: cleargate@0.11.3
context_source: |
  Extension of v0.11.2 hotfix. v0.11.2 added a "⚠ Restart Claude Code in
  this repo" warning at end of `cleargate upgrade` when `.claude/settings.json`
  or `.mcp.json` was modified during the run. Detection uses `currentSha !==
  postSha`. Issue: any non-byte-identical write triggers the warning, even
  no-op rewrites where the file's effective content is unchanged but
  formatting drifted (key order, whitespace, trailing newline). User
  perceives "I just upgraded and got told to restart, but nothing real
  changed" — warning fatigue erodes the signal. CR-059 narrows the trigger
  to actual schema-meaningful changes: hooks block content for settings.json,
  mcpServers.cleargate entry for .mcp.json. Cosmetic-only writes are
  detected and suppressed.

  Constraint: must remain conservative. False-negative (suppressed when
  restart IS needed) is worse than false-positive (warned when not needed).
  When in doubt, warn.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:51:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-059
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T08:51:13Z
  sessions: []
---

# CR-059: Smarter session-load restart warning — suppress no-op rewrites

## 0.5 Open Questions

- **Question:** What counts as a "schema-meaningful change" for `.claude/settings.json` — only the `hooks` block, or also `permissions`/`env`/anything else under `hooks`?
- **Recommended:** Only the `hooks.{PreToolUse,PostToolUse,SessionStart,SubagentStop}.*` arrays — those are what Claude Code reads at session start for hook firing. Other settings keys are read on-demand or per-tool-call.
- **Question:** For `.mcp.json`, should the cleargate-only entry change trigger the warning, or any change to any server entry?
- **Recommended:** Only the `mcpServers.cleargate` entry. Other servers are managed by the user; we don't own their restart semantics.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Current code: `if (postSha !== currentSha && (entry.path === '.claude/settings.json' || entry.path === '.mcp.json')) restartFiles.push(entry.path)`. Any byte change → warning fires.

**New Logic (The New Truth):**
- Compute a *normalized* sha that reflects only schema-meaningful keys for the file in question. For `.claude/settings.json`, hash a JSON canonicalization of `settings.hooks` only. For `.mcp.json`, hash `settings.mcpServers.cleargate` only. Trigger warning iff the normalized-sha changed, not the byte sha.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — CR-059 is self-contained, no story currently in flight references this code path.
- [ ] Invalidate/Update Epic: link to EPIC-016 (Upgrade UX) for tracking; no body changes required.
- [ ] Database schema impacts? No — pure CLI behavior change.
- [ ] User-visible behavior change: Yes. The warning will fire less often. Document in CHANGELOG and update `cleargate-cli/README.md` if the previous behavior was documented.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/upgrade.ts:455-475` — the `SESSION_LOAD_PATHS` set + `sessionRestartFiles` tracker added in v0.11.2.
- **Surface:** `cleargate-cli/src/commands/init.ts:329` — the parallel "Updated .claude/settings.json: ... — restart Claude Code if already open" message added in v0.11.2.
- **Why this CR extends rather than rebuilds:** v0.11.2 introduced the warning mechanism with a coarse trigger (byte-level diff). CR-059 keeps the same emission path and only refines the condition that flips the restart-file tracker from "any byte change" to "schema-meaningful change". One function call deeper, no plumbing rewrite.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/upgrade.ts` — replace the byte-sha check with a normalized-content check. Add a small helper like `extractSessionLoadDelta(filePath, oldContent, newContent): boolean`.
- `cleargate-cli/src/commands/init.ts` — apply the same suppression to the line 329 message: only warn if the merged settings differ from existingSettings in the hooks block.
- `cleargate-cli/test/commands/upgrade.test.ts` — add cases for: (a) byte-different but schema-equivalent settings.json (e.g., reformatted JSON) → warning suppressed; (b) actual hooks-block change → warning fires.

**Do NOT touch:** the hot-shipped 0.11.3 `+x` preservation in `writeAtomic()`. Leave that alone.

## 4. Verification Protocol

**Test 1 — suppression on cosmetic rewrite:** craft a fixture target with `.claude/settings.json` re-formatted (key order changed, whitespace normalized) but functionally identical. Run upgrade. Assert: stdout contains `[upgrade] complete.` but does NOT contain `Restart Claude Code`.

**Test 2 — warning on real hooks change:** fixture target with an old hook command. Run upgrade where the new payload changes the hook command. Assert: stdout contains the `Restart Claude Code` block listing `.claude/settings.json`.

**Test 3 — same for .mcp.json:** fixture with cosmetic re-key (e.g., other servers reordered) → suppressed. Fixture with `mcpServers.cleargate.args` change → warned.

**Command:** `cd cleargate-cli && npm test`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — open questions on schema-meaningful key scope.

Requirements to pass to Green (Ready to Apply):
- [x] Old vs. New logic explicitly defined.
- [x] Blast radius declared.
- [x] Existing surfaces cited with file:line.
- [x] Execution sandbox restricted.
- [ ] Verification protocol with command provided. — *test cases sketched, not yet written*
- [ ] `approved: true` is set in the YAML frontmatter.
