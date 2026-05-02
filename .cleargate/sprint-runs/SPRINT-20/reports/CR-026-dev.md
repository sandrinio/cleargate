---
report_type: dev
work_item_id: CR-026
sprint_id: SPRINT-20
agent: developer
commit: bd6eb4f
status: done
typecheck: pass
tests_passed: 127
tests_failed: 0
---

# CR-026 Developer Report

## STORY: CR-026
STATUS: done
COMMIT: bd6eb4f
TYPECHECK: pass
TESTS: 127 passed, 0 failed

## FILES_CHANGED

**Modified (tracked):**
- `.claude/hooks/token-ledger.sh` — Defect 1 fix (newest-file lookup) + Defect 2 fix (BANNER_SKIP_RE constant + banner-skip in legacy work-item-id resolution block). Added BANNER_SKIP_RE constant near top; replaced session-id-keyed dispatch-file lookup with `ls -t .dispatch-*.json | head -1`.
- `.cleargate/scripts/write_dispatch.sh` — Added FALLBACK PATH comment block after `# Usage:` header (no logic changes).
- `CLAUDE.md` — Replaced "Orchestrator Dispatch Convention" paragraph with the verbatim M3 plan text (primary = hook, fallback = manual write_dispatch.sh).
- `cleargate-cli/scripts/build-manifest.ts` — Added `script` tier rule for `.cleargate/scripts/**` so canonical write_dispatch.sh appears in MANIFEST.
- `cleargate-cli/src/lib/manifest.ts` — Added `'script'` to `Tier` union to support the new tier rule.
- `cleargate-cli/test/hooks/token-ledger-attribution.test.ts` — Added CR-026-A (path-B regression: non-session-id dispatch filename) + CR-026-B (banner-skip regression) scenarios.
- `cleargate-cli/test/snapshots/hooks-snapshots.test.ts` — Added CR-026 snapshot test (supersedes CR-018 byte-equality assertion); CR-018 assertion demoted to "historical baseline exists" check.
- `cleargate-planning/.claude/hooks/token-ledger.sh` — Canonical mirror of live hook (byte-copy).
- `cleargate-planning/.claude/settings.json` — Added pre-tool-use-task.sh as sibling hook on PreToolUse:Task matcher (after pending-task-sentinel.sh). overwrite_policy remains merge-3way per M3 plan.
- `cleargate-planning/CLAUDE.md` — Canonical mirror of CLAUDE.md Orchestrator Dispatch Convention update.
- `cleargate-planning/MANIFEST.json` — Regenerated via `npm run prebuild` (62 files, up from 34; script tier added write_dispatch.sh + 27 other script files from canonical tree).

**Created (new):**
- `cleargate-cli/test/hooks/pre-tool-use-task.test.ts` — 11 tests (6 required scenarios + 5 additional).
- `cleargate-cli/test/snapshots/hooks/token-ledger.cr-026.sh` — Snapshot of updated canonical token-ledger.sh.
- `cleargate-planning/.claude/hooks/pre-tool-use-task.sh` — Canonical mirror of new PreToolUse:Task hook (chmod +x).
- `cleargate-planning/.cleargate/scripts/write_dispatch.sh` — Canonical mirror of live write_dispatch.sh (chmod +x, new file).

## NOTES

**Defer:** `.pending-task-*.json` dead-code removal (Bonus defect from BUG-024 §3.1) deferred per M3 plan. The path is underused but not unwritten — `pending-task-sentinel.sh` actively writes those files and the SENTINEL_TURN_INDEX at line 154 is read for delta accounting. Removing would break the no-dispatch-marker path. Open CR-029 for SPRINT-21.

**GOTCHA-7 (M3 plan):** The `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §1 dispatch text still references `write_dispatch.sh` as the primary path (lines 80-89, 171, 216, 244, 375). CR-026 updates CLAUDE.md first; STORY-026-01's R5 byte-copy of the live skill carries the correct dispatch-convention text post-merge. The chain works as designed. No action required from CR-026 — STORY-026-01's Developer must verify after CR-026 merges.

**settings.json overwrite_policy:** Retained `merge-3way` (existing MANIFEST entry). Per M3 plan §Risk table: 3-way merge propagates the new hook entry to downstream users on `cleargate init` upgrade while preserving their customizations. Switching to `preserve-on-conflict` would freeze downstream settings.

**Snapshot test:** `hooks-snapshots.test.ts` CR-018 byte-equality assertion superseded by CR-026 assertion per the copy-on-fix pattern. CR-018 snapshot file retained as historical baseline.

**Pre-existing failures:** 32 tests fail in `test/cli.test.ts` and `test/commands/bootstrap-root.test.ts` — verified pre-existing on baseline (stash verify), unrelated to CR-026 surfaces.

---

## Rework Pass (qa_bounces=1) — 2026-05-02

QA bounced on missing `cleargate-cli/test/hooks/cr-026-integration.test.ts`. The M3 plan §"Test shape → Real-infra integration test" (lines 174-178) lists this as a REQUIRED NEW FILE covering Gherkin Scenarios 2 + 3 (end-to-end cross-hook chain). It was not delivered in the initial commit.

**Fix:** Created `cleargate-cli/test/hooks/cr-026-integration.test.ts` — single `it()` using `execFileSync` against both hooks in sequence. Tmpdir as fake repo root, `SPRINT-CR-026-TEST` sentinel, synthetic PreToolUse:Task stdin for pre-tool-use-task.sh, synthetic SubagentStop transcript for token-ledger.sh. Asserts: dispatch marker written → ledger row with `work_item_id: STORY-026-01` + `agent_type: developer` → dispatch file renamed and cleaned up → hook logs contain `wrote dispatch:` and `dispatch-marker:` lines.

**Rework commit:** (see COMMIT field above — updated by new commit)
**Typecheck:** pass
**Tests:** 128 passed, 0 failed (127 prior + 1 new integration test)

## flashcards_flagged:
  - "2026-05-02 · #hooks #ledger #dispatch · CR-026: token-ledger.sh now uses newest-file lookup (ls -t .dispatch-*.json | head -1), not session-id-keyed; orchestrator CLAUDE_SESSION_ID never matches subagent's SubagentStop payload session_id"
  - "2026-05-02 · #hooks #attribution #pre-tool-use-task · PreToolUse:Task hook auto-writes dispatch marker by grepping tool_input.prompt for first work-item ID; banner-immune (no transcript); uniquified filename avoids parallel-spawn collision"
  - "2026-05-02 · #hooks #ledger #banner-skip · token-ledger.sh transcript-grep fallback now skips ^[0-9]+ items? blocked: prefix via BANNER_SKIP_RE; SessionStart banner stops poisoning work_item_id attribution"
  - "2026-05-02 · #snapshot #hooks · token-ledger.sh has a copy-on-fix snapshot lock in test/snapshots/; update token-ledger.cr-NNN.sh + supersede the byte-equality assertion every time the hook changes"
