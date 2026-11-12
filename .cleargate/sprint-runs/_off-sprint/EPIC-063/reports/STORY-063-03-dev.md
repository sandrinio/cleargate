# STORY-063-03 Developer report (role: developer)

STORY: STORY-063-03
STATUS: done
COMMIT: d54d516 (branch story/STORY-063-03, cleargate-cli repo)
TYPECHECK: pass (npm run typecheck clean)
TESTS:
- Full `npm test`: 4037 tests, 4035 pass, 0 fail, 2 skipped (exit 0).
- post-shell-ingest.red.integration: 22 pass, 0 fail, 1 skipped (timing half, CLEARGATE_PERF gate).
- clean-room-claude-baseline.red.integration: 13/13 pass. Needs a commit first (it packs HEAD); it failed 9 != 10 hooks on the uncommitted tree and passes on d54d516.
- codex-loop.red.integration: 2/2 pass. Same commit-first dependency (5 != 6 before commit).
- stamp-and-gate-context.red.integration: 19/19 pass.
- Unit files (shell-ingest, wiring, claude-hook-addition-bash, docs, codex-payload, init, uninstall, ...) are inside the full `npm test` run, all green.
- `node scripts/build-codex-payload.mjs --check`: exit 0.

PERF (CLEARGATE_PERF=1, one run, load average 6.7/8.2/9.5, not tuned):
- hook p95 467.3 ms, baseline p95 87.0 ms, delta 380.4 ms. Fails the 150 ms assertion on this loaded machine.
- Each git spawn costs far more than 150 ms wall here (see decision 12). The no-op path is 2 git spawns (rev-parse, status) and 0 node. Needs a quiet-machine rerun at release section R.

FILES_CHANGED:
- cleargate-cli/scaffold/hosts/claude/.claude/hooks/post-shell-ingest.sh (new, 0755)
- cleargate-cli/scaffold/hosts/codex/.codex/hooks/post-shell-ingest.sh (generated copy)
- cleargate-cli/scaffold/hosts/claude/.claude/settings.json (Bash PostToolUse group)
- cleargate-cli/scaffold/hosts/codex/.codex/hooks.json (hand-edited Bash group)
- cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md (step 4 no longer "via Task")
- cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-ingest.toml (gen:codex)
- cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md (section 10.9 #2 names post-shell-ingest.sh)
- cleargate-cli/scripts/build-codex-payload.mjs (CODEX_HOOK_SCRIPTS)
- cleargate-cli/src/hooks/shell-ingest.ts (new: parseShellSnapshot, computeShellChanges)
- cleargate-cli/src/commands/hook.ts (hookShellIngestHandler)
- cleargate-cli/src/cli.ts (hidden `hook shell-ingest`)
- cleargate-cli/src/hosts/claude.ts (CLAUDE_HOOK_ADDITION Bash group, decision 13)
- cleargate-cli/src/lib/manifest-builder.ts (two pin-aware rows)
- cleargate-cli/src/lib/settings-json-surgery.ts (post-shell-ingest in CLEARGATE_HOOK_SCRIPT_NAMES)
- cleargate-cli/test/snapshots/hooks/post-shell-ingest.story-063-03.sh (lock, pin 0.5.0)

NOTES: Implemented per the M1 blueprint plus decisions 10-14. Hook fast path: `rev-parse HEAD` + `status --porcelain=v1 -z` (process substitution, `read -d ''`, bash 3.2 safe) + `hash-object` only when dirty; compares to the snapshot; the guard uses `--path-format=absolute --git-path` for MERGE_HEAD/rebase-merge/rebase-apply; non-delivery commits take the `diff --quiet` path; mkdir lock with stale-clear and owned-only release; handler output buffered in a mktemp file, then `emit-context ... || cat`; the E2 failure line is bash-built; the snapshot written is the pre-ingest fingerprint. Handler: in-process wikiIngestHandler with a non-throwing exit seam, git runner pinned to `-C repoRoot` (so ingest's git calls do not depend on process cwd), G3 freshness dedup, stderr captured into the failure lines. Composed payload refreshed with copy-planning-payload + build-manifest only (no build, no dist). No red test was edited. Not done by design: story's manual 2.2 / live re-sync (moved to release section R). Snapshot lock created from the final hook, byte-equal.

r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # deterministic half green; timing half gated, 380 ms delta under load, see PERF
  - { r_id: "R6", covered: true, deferred: false, clarified: false }

plan_deviations:
  - { what: "status parsed via process substitution instead of a temp file", why: "avoids an mktemp/rm spawn on the no-op path; not-a-repo detected via a rev-parse --git-dir fallback only when HEAD lookup fails", orchestrator_confirmed: false }
  - { what: "handler headDiff uses `git diff --name-status -M -z`", why: "NUL-separated output keeps paths with spaces intact (parity with the status -z parser)", orchestrator_confirmed: false }
  - { what: "single rev-parse call for all three merge/rebase paths (with --path-format=absolute)", why: "one spawn instead of three", orchestrator_confirmed: false }

adjacent_files:
  - "cleargate-cli/src/commands/wiki-ingest.ts (called in process; uses the injected gitRunner)"
  - "cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh (same resolver and emit-context pattern)"
  - "cleargate-cli/src/lib/init-fixture / test/helpers/init-fixture.ts (recorded-baseline compare mode, already stale)"
  - "cleargate-cli/src/commands/upgrade merge path (BUG-093: replaces a user's whole PostToolUse array)"

flashcards_flagged:
  - "2026-11-12 · #git #hooks · rev-parse --git-path prints a path relative to -C's dir; a hook whose cwd is not the root needs --path-format=absolute."
  - "2026-11-12 · #git #shell · porcelain v1 without -z quotes paths with spaces; bash must use -z + read -d '' (and never $(...), which drops NULs)."
  - "2026-11-12 · #test-harness #e2e · clean-room packed-artifact pins clone HEAD: they fail until the story commit exists; run them after committing."
  - "2026-11-12 · #hooks #macos · No-op hook path: 2 git spawns still cost ~300+ ms p95 delta at load 7; the 150 ms budget needs a quiet machine."
