---
cr_id: CR-093
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
area: cli
context_source: verified codebase grounding — reproduced from a dogfooding repo's .cleargate/hook-log/gate-check.log, root-caused to wiki-ingest.ts:89 + stamp-and-gate.sh, regression-tested pre-fix
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T01:31:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-093
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T01:31:39Z
  sessions: []
---

# CR-093: The File Argument Owns the Project Root

## 0.5 Open Questions

- **Question:** Should a worktree get its own `.cleargate/wiki/`, or should ingest always write back to the main checkout?
- **Recommended:** Per-worktree, which is what this CR implements. A worktree is a full checkout; its wiki merges when the branch merges, exactly like every other tracked file. The alternative — always-main — needs the hook to pass `--cwd "$REPO_ROOT"` *and* the containment check relaxed to accept sibling roots, which reintroduces the ambiguity this CR removes. Note the observed repo had hand-symlinked `wiki`, `sprint-runs`, and `hook-log` back to the main checkout; that is a local convention ClearGate does not create and does not depend on.
- **Human decision:** {populated during Brief review}

- **Question:** The token ledger carried a stale `work_item_id` (`EPIC-020`) forward across ~20 rows into an unrelated sprint window, while bucketing them `_off-sprint`.
- **Recommended:** Out of scope here. That fallback is BUG-027's deliberate fix for a different misattribution class, and narrowing it (e.g. refusing carry-forward when the sprint bucket changes) is a judgement call on someone else's tradeoff, not a bug in this one. Raise separately.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that `resolveProjectRoot(process.cwd())` is the correct root for a command that was handed a file. It is not. CR-092 established "walk up from cwd" and that fix is sound for its case — a cwd *inside* the project — but it was applied uniformly, including to commands whose subject is a file that may sit under a **different** root entirely.
- Forget that a silent `exit 2` from `wiki ingest` is acceptable because the log records it. The hook always exits 0, so the log was the only surface, and nobody reads it until something is already wrong.
- Forget that everything under `.cleargate/delivery/` is a work item. `SPRINT-NN_waves.json` is not.

**New Logic (The New Truth):**
- When a command's subject is an **absolute** file path, that file's own project root is authoritative. `resolveProjectRootForFile(filePath, startDir?)` walks up from the file's directory; only if the file is relative, or absolute but under no project at all, does it fall back to the process root.
- Relative paths keep CR-092 behaviour unchanged. `cleargate gate check .cleargate/delivery/x.md` run from `backend/` must keep working — that is the case CR-092 exists to fix.
- `findProjectRoot()` returns `string | null`. `resolveProjectRoot()` keeps its `?? startDir` fallback contract and is now a thin wrapper. The distinction matters: the old fallback made "found a root" indistinguishable from "gave up".
- A failed ingest is re-emitted to hook stdout as `⚠️ wiki ingest failed: …`, the same channel the gate `⚠️` path already used. The hook still never blocks a write.
- The hook processes `*.md` only.

**The failure this fixes.** A git worktree is a sibling checkout. The PostToolUse hook runs with `CLAUDE_PROJECT_DIR` pinned to the main checkout while the agent writes into `<repo>-<sprint>/`. Walking up from cwd reaches the main checkout every time, so `wiki ingest` computed `<main>/.cleargate/delivery`, ran `path.relative()` against a path under `<repo>-<sprint>/`, got `../..`, and rejected the file it had just been handed. Observed in a dogfooding repo across a full sprint: the sprint plan, three stories, three bugs and one CR all logged `ingest=2` and none reached the wiki. Because the wiki is what the duplicate-check-before-drafting protocol queries, drafting for that sprint was also running blind.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update CR: [[CR-092]] — not reverted. CR-092 remains correct for its case; this CR narrows where its helper is the right tool and adds a second helper beside it.
- [ ] Invalidate/Update Story: none. No story depends on the old resolution.
- [ ] Database schema impacts? **No.** Pure path resolution and a shell hook.

**Downstream risk.**
- `push` now derives `projectRoot` from `fileOrId` when that argument is an absolute path. When it is an ID (the common case) it is not absolute, so the fallback runs and behaviour is unchanged.
- Any caller passing an explicit `cwd`/`projectRoot` option is untouched — the new helper sits only in the `??` fallback position.
- Wikis in existing worktrees will now populate where they previously stayed empty. Items authored in a worktree during the silent window are still missing and need one `cleargate wiki build` per affected tree to backfill.
- The three non-file `gate` call sites (`resolveRunScriptForGate`, `gate qa`, `gate arch`) deliberately keep `resolveProjectRoot(process.cwd())`; they take a worktree/branch pair, not a file.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/project-root.ts:32` — `resolveProjectRoot()`, CR-092's cwd-walking resolver. Extended, not replaced.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:89` — the P0 site; the containment check at `:110-117` is what rejected worktree paths.
- **Surface:** `cleargate-cli/src/commands/gate.ts:150` and `:324` — the two file-taking gate handlers.
- **Surface:** `cleargate-cli/src/commands/stamp.ts:70`, `cleargate-cli/src/commands/stamp-tokens.ts:65`, `cleargate-cli/src/commands/wiki-contradict.ts:52`, `cleargate-cli/src/commands/push.ts:88` — the remaining file-taking commands.
- **Surface:** `cleargate-planning/.claude/hooks/stamp-and-gate.sh:22` — the delivery-path filter; `:40` — the ingest call whose failure was swallowed.
- **Why this CR extends rather than rebuilds:** CR-092 already owns "find the project root" and its `isProjectRoot` marker logic is correct and tested. Rebuilding would duplicate that walk. What was missing is the notion that a *file argument* carries its own root, so the change is one new exported function beside the existing one plus a fallback-position swap at seven call sites. The resolver's semantics for every existing caller are byte-for-byte unchanged.

## Prior work

- [[CR-092]] — same symptom (`not under .cleargate/delivery/`, silent exit), different cause: cwd in a subdirectory rather than a sibling root. Its fix is a prerequisite for this one and its flashcard entry is the closest existing lesson.
- [[CR-086]] — gitignored runtime sentinels (`.active`) are absent in linked worktrees; the same worktree-vs-main-checkout confusion in the gate path.
- [[CR-087]] — an unguarded `--prefix` check that blocked every linked worktree of the meta-repo.
- No prior item covers project-root resolution for a file argument. Grep of `.cleargate/delivery/archive/` and `.cleargate/FLASHCARD.md` for `worktree.*ingest` / `ingest.*worktree` returned no hits.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/project-root.ts` — add `findProjectRoot()`, `resolveProjectRootForFile()`; refactor `resolveProjectRoot()` onto the former.
- `cleargate-cli/src/commands/wiki-ingest.ts`, `wiki-contradict.ts`, `stamp.ts`, `stamp-tokens.ts`, `push.ts` — swap the fallback.
- `cleargate-cli/src/commands/gate.ts` — swap the fallback at the two file-taking handlers only.
- `cleargate-planning/.claude/hooks/stamp-and-gate.sh` — `*.md` filter; capture + re-emit ingest failure.
- `cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh` — mirrored by `npm run prebuild`, never hand-edited.
- `cleargate-cli/test/lib/project-root.node.test.ts`, `cleargate-cli/test/hooks/stamp-and-gate.node.test.ts` — regression tests.
- `cleargate-cli/test/snapshots/hooks/stamp-and-gate.cr-093.sh` — new snapshot lock; `cr-009` retained as historical baseline.
- `cleargate-cli/test/commands/init.node.test.ts` — rendered-hook assertion moves to the cr-093 lock.
- `cleargate-cli/CHANGELOG.md` — Unreleased entry.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && npm test`

- Full suite: **2255 pass / 0 fail / 1 skipped** (2256 tests, 822 suites).
- The worktree regression test was run against the pre-fix line and reproduced the production message verbatim: `worktree items must ingest; got: wiki ingest: …/CR-998_Worktree_Probe.md not under .cleargate/delivery/`. It passes post-fix.
- Old logic evicted: `grep -rn "resolveProjectRoot(process.cwd())" src/commands/` returns only the three non-file `gate` sites, which are intentional.
- Hook parity: `diff` of canonical vs `cleargate-cli/templates/**` after `npm run prebuild` is empty.

---

## Context Source

**context_source:** verified codebase grounding + reproduced failure. Root-caused from a dogfooding repo's `.cleargate/hook-log/gate-check.log` (167 pre-0.20.0 `readiness-gates.md` errors confirmed already fixed by CR-092 and excluded from scope; the surviving `ingest=2` entries traced to `wiki-ingest.ts:110-117`). No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
