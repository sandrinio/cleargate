# Fresh-Journey Smoke — SPRINT-41 QA

## Environment

- CLI under test: `node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js`, version `0.26.1`, built from cli main `35580b0`.
- Shim: `/private/tmp/cg-s41-fresh-journey-bin/cleargate` — a `#!/bin/sh` wrapper that `exec`s the dist CLI above. Verified via `command -v cleargate` before use.
- Project root: `/private/tmp/cg-s41-fresh-journey` (did not exist beforehand; created for this run).
- Date: 2026-09-26 (UTC).
- Note: the globally-installed `cleargate` (`/opt/homebrew/bin/cleargate`) also happens to report `0.26.1`, so a couple of Write-tool-triggered PostToolUse hooks in the harness's own repo resolved via PATH to that global binary rather than the shim; version matched, so no skew observed. All CLI commands recorded in the step table below explicitly used the shim per the mandated invocation shape.

## Step table

| # | Step | Command (representative) | Exit | Result |
|---|---|---|---|---|
| 0 | git init + scaffold commit | `git init -q`; commit README.md + package.json | 0 | tinytodo repo created, 1 commit |
| 1 | `cleargate init` | `cleargate init --yes` | 0 | No prompts (--yes). 81 files under `.claude/`+`.cleargate/`, plus root `CLAUDE.md`, `.mcp.json`, `.gitignore`. Printed a restart-Claude-Code reminder for the MCP server. |
| 2a | `cleargate doctor` | `cleargate doctor` | 0 | `[doctor] Hook config present in .claude/settings.json.` |
| 2b | `cleargate doctor --session-start` | `cleargate doctor --session-start` | 0 | Banner: `pre-member`, no drift line, no blocked-items warning. Sane for a fresh repo. |
| 3 | Skim CLAUDE.md / .cleargate/README.md | (read) | – | Clear; Quickstart's next step ("draft a work item") is obvious. One friction noted below (FJ-1). |
| 4 | Simulate SessionStart hook | `echo '{...}' \| .claude/hooks/session-start.sh` | 0 | Same banner as `doctor --session-start`. |
| 5 | `new epic` x2 + author + gate | `cleargate new epic "task-storage"`; `cleargate new epic "cli-commands"`; `cleargate gate check <file> -v` | 0 / 0 | Both scaffolded correctly (EPIC-001, EPIC-002); both authored epics passed `epic.ready-for-decomposition` (12/12) on the **first** attempt, using `approved_by`+`approved_at` (no initiative in a fresh repo) and "none — net-new" Existing Surfaces / Prior work sentinels — the documented fresh-repo accommodations work as described. |
| 6 | `new story` x3 + author + gate | `cleargate new story "load-and-save-tasks" --epic EPIC-001` (x3) | 0 | STORY-001-01, STORY-001-02 (EPIC-001), STORY-002-01 (EPIC-002) correctly namespaced. All 3 passed `story.ready-for-execution` (14/14) on the first attempt. Granularity Rubric and SPIDR/Gherkin sections read clearly; L2 stories correctly allowed to omit Task Breakdown. |
| 7 | `new bug` + author + gate | `cleargate new bug "list-crashes-on-missing-file"` | 0 | BUG-001 passed `bug.ready-for-fix` (9/9) on the first attempt. Bug.md is the only template that actually scaffolds a literal `approved:` key (see FJ-1). |
| 8a | PostToolUse hook (stamp+gate+ingest) | `echo '{"tool_name":"Write","tool_input":{"file_path":"..."}}' \| .claude/hooks/stamp-and-gate.sh` | 0 (always) | Ran for all 6 authored items. stamp/gate/ingest all succeeded; stories correctly skipped ingest (`wiki ingest: STORY-001-01 skipped (bucket 'stories' not in wiki.ingest_buckets)`). |
| 8b | `wiki build` | `cleargate wiki build` | 0 | `wiki build: OK (3 pages written)` — 2 epics + 1 bug; stories excluded as documented. |
| 8c | `wiki query "storage"` | `cleargate wiki query "storage"` | 0 | 1 match (EPIC-001), correct — but see FJ-4 (cosmetic duplicate text). |
| 8d | `wiki lint` | `cleargate wiki lint` | 0 | `lint: OK (3 pages checked, 0 findings)`. |
| 9 | Approval (Gate 1) | frontmatter edit: `approved_by`/`approved_at` (epics/stories), `approved: true` (bug) | – | Mechanism is documented but inconsistent across templates — see FJ-1 (major). |
| 10a | `new sprint "mvp"` + author + gate | `cleargate new sprint "mvp"`; `cleargate gate check ... -v` | 0 / 0 | SPRINT-01 authored with `epics: ["EPIC-001","EPIC-002"]` and all 3 stories in §1; `sprint.ready-for-execution` passed 2/2. |
| 10b | `sprint preflight SPRINT-01` (1st try) | `cleargate sprint preflight SPRINT-01` | 1 | `✗ main is dirty` — correctly caught that the installed scaffold + authored items were never committed. Actionable message. |
| 10c | commit scaffold + items, re-run preflight | `git add -A && git commit ...`; `cleargate sprint preflight SPRINT-01` | 0 / 0 | All 5 checks pass after committing. |
| 10d | `sprint init SPRINT-01 --stories ...` (1st try) | `cleargate sprint init SPRINT-01 --stories STORY-001-01,STORY-001-02,STORY-002-01` | 1 | **BUG-090 reproduced** — `UNAPPROVED (3): STORY-001-01, STORY-001-02, STORY-002-01`. See FJ-1 for root cause (not positional — the literal `approved:` key is simply absent from freshly-scaffolded stories). |
| 10e | add literal `approved: true`, retry | `sed -i '' '/^approved_at:/a\napproved: true' <file>` (all 3 stories); `cleargate sprint init ...` | 0 | Unblocked immediately. Field **position** did not matter (inserted mid-block, not first key) — confirms the trigger is the key's absence, not its position. `state.json` initialized with all 3 stories `"Ready to Bounce"`. Two WARNs printed (no lane assignments; Goal Acceptance Check unresolved) — both self-explanatory and non-blocking. |
| 11 | `push EPIC-001...` | `cleargate push .cleargate/delivery/pending-sync/EPIC-001_task_storage.md` | 2 | `cleargate push: requires membership. Run: cleargate join <invite-url>` — exactly as documented. `join` NOT run. |
| 12a | `doctor` (final) | `cleargate doctor` | 0 | Same clean output. |
| 12b | `scaffold-lint` (final) | `cleargate scaffold-lint` | 0 | `scaffold-lint: clean` printed **twice** in a target repo with no `cleargate-planning/` — see FJ-5 (cosmetic). |
| 12c | `git status --porcelain` (project) | `git status --porcelain` | – | 3 stories modified (approved-field experiment) + `.cleargate/sprint-runs/` untracked (expected — sprint-runs is meant to be committed per this project's own convention, matches the meta-repo's own tracked `sprint-runs/SPRINT-41/*` files). No stray hook-log/ledger pollution. |
| 12d | `git check-ignore -v` spot checks | `.claude/settings.json`, `.cleargate/hook-log/...`, `.cleargate/wiki/index.md` | 1 / 0 / 1 | Correct: settings.json and wiki tracked; hook-log ignored via `.cleargate/.gitignore:13:/hook-log/`. |

## Issues

### FJ-1 — major (known-dup: BUG-090, root cause pinned down + a second manifestation found)
**Severity:** major
**Repro:** `cleargate new story "x" --epic EPIC-001` (or `new epic`), author it per the template, set `approved_by`+`approved_at` and flip the Ambiguity Gate to 🟢 exactly as the template instructs, then `cleargate sprint init SPRINT-01 --stories STORY-00X-0Y`.
**Observed vs expected:** Observed: `sprint init` fails with `UNAPPROVED (N): ...` even though `cleargate gate check <file> -v` passed 🟢 on the same file. Expected: an item the readiness gate calls "Ready for Execution" should not be independently rejected as "unapproved" by a different mechanism with no shared vocabulary.
**Root cause (confirmed by reading, then reproducing):** ClearGate has two independent, non-interoperating notions of "approved" for epics/stories:
  1. The readiness-gate `parent-approved` predicate (`readiness-predicates.ts:316-342`) — satisfied by top-level `approved_by`+`approved_at` (or a `proposal_gate_waiver` carrying the same), exactly as CLAUDE.md documents ("...or top-level approved_by + approved_at also count").
  2. `assert_story_files.mjs`'s literal regex check (used by `sprint init`) and `push.ts`'s hard client-side gate — both require a literal frontmatter line matching `^approved:\s*["']?(true)["']?\s*$` (`scaffold/core/.cleargate/scripts/assert_story_files.mjs:168-169`; `src/commands/push.ts:271-274`).
  `epic.md` and `story.md` never scaffold an `approved:` key at all (only `approved_by`/`approved_at`) — only `Bug.md` scaffolds `approved: false`. So any epic/story authored by following the templates and CLAUDE.md's own documented approval route will gate-check 🟢 and then silently fail both `sprint init` and (independently) `push`, the latter with the misleading message `has approved: false` even when the key is simply *absent*, not `false`.
  I tested whether **reordering** the frontmatter mattered (per the task's "positional frontmatter" hint): it does not — inserting `approved: true` anywhere in the block (not first) fixed `sprint init` immediately. The real trigger is the key's total absence from the epic/story templates, not its position.
**Evidence:**
```
UNAPPROVED (3): STORY-001-01, STORY-001-02, STORY-002-01
ERROR: sprint init blocked — 0 items missing, 3 unapproved, 0 stub-empty. Fix the above, then re-run init.
```
```
Error: push refused — EPIC-001 has approved: false. Set approved: true in frontmatter after review.
```
(push message reconstructed from `push.ts:272-274`; not directly observable in this run because the pre-member membership gate short-circuits `cleargate push` before reaching the approved check — confirmed exit 2 `requires membership` fires first.)
**Suspected source:** `cleargate-cli/scaffold/core/.cleargate/templates/epic.md` and `.../story.md` (missing `approved:` key); `cleargate-cli/scaffold/core/.cleargate/scripts/assert_story_files.mjs:145-175`; `cleargate-cli/src/commands/push.ts:268-274`.
**Known-dup:** BUG-090.

### FJ-2 — minor
**Severity:** minor
**Repro:** `cleargate gate check .cleargate/delivery/pending-sync/EPIC-001_task_storage.md -v` on an item that passes cleanly.
**Observed vs expected:** `-v`/`--verbose` is documented as "show full expected-vs-actual detail per criterion" but produces zero extra output when the gate passes — only `✅ epic.ready-for-decomposition passed (12 criteria)`. The per-criterion `[pass]/[fail]` breakdown only appears when at least one criterion fails.
**Evidence:**
```
$ cleargate gate check EPIC-001... -v
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)
```
(vs. on a failing scratch copy, `-v` printed all 12 `[pass]/[fail]` lines.)
**Suspected source:** `cleargate-cli/src/commands/gate.ts:311-326` — the `if (opts.verbose)` block is nested inside the `else` (failure) branch only.
**Known-dup:** none.

### FJ-3 — minor / cosmetic
**Severity:** minor
**Repro:** `cleargate stamp .cleargate/delivery/pending-sync/EPIC-001_task_storage.md --dry-run`
**Observed vs expected:** The diff preview renders nested frontmatter fields (`cached_gate_result`, `draft_tokens`) as `[object Object]` instead of a real value or sub-diff.
**Evidence:**
```
 cached_gate_result: [object Object]
 draft_tokens: [object Object]
```
**Suspected source:** `cleargate-cli/src/commands/stamp.ts:44-52` (`buildDiffPreview` uses `String(bVal)`/`String(aVal)` unconditionally, which stringifies objects via `Object.prototype.toString`).
**Known-dup:** none.

### FJ-4 — minor / cosmetic
**Severity:** minor
**Repro:** `cleargate wiki query "storage"`
**Observed vs expected:** Output line duplicates the wikilink prefix: `- [[EPIC-001]] — - [[EPIC-001]] (epic) — Draft — Task Storage` (the excerpt already contains the full index line, including its own `- [[ID]]` prefix).
**Evidence:**
```
- [[EPIC-001]] — - [[EPIC-001]] (epic) — Draft — Task Storage
```
**Suspected source:** `cleargate-cli/src/commands/wiki-query.ts:124` — `bodyLines.push(\`- [[${id}]] — ${excerpt}\`)` where `excerpt` is `line.trim()` of the already-formatted index line (captured at `wiki-query.ts:77`).
**Known-dup:** none.

### FJ-5 — cosmetic
**Severity:** cosmetic
**Repro:** `cleargate scaffold-lint` in a target repo with no `cleargate-planning/` directory (the normal case for every repo `cleargate init` installs into).
**Observed vs expected:** Prints `scaffold-lint: clean` twice instead of once.
**Evidence:**
```
scaffold-lint: clean
scaffold-lint: clean
```
**Suspected source:** `cleargate-cli/src/commands/scaffold-lint.ts:62` and `:125` — `runScaffoldLint` already prints `'scaffold-lint: clean'` and returns `{exitCode: 0}` on the "no planning dir" early-return path (line 125); the caller `scaffoldLintHandler` then prints it again unconditionally whenever `result.exitCode === 0` (line 62).
**Known-dup:** none.

### FJ-6 — cosmetic
**Severity:** cosmetic
**Repro:** Author any epic/story/bug in a repo with no active sprint, run/observe the PostToolUse hook (or `cleargate stamp-tokens <file>`).
**Observed vs expected:** Frontmatter gains `stamp_error: "no ledger rows for work_item_id EPIC-001"` right after authoring — before any sprint or agent work has touched the item. Technically correct (there genuinely is no ledger yet), but a first-time user reviewing their freshly-drafted Gate-1 item may read `stamp_error` as something having gone wrong.
**Evidence:** (excerpt from EPIC-001 frontmatter immediately after first PostToolUse hook run)
```
stamp_error: no ledger rows for work_item_id EPIC-001
```
**Suspected source:** `cleargate-cli/src/commands/stamp-tokens.ts:145-149`.
**Known-dup:** none.

## Worked well

- `cleargate init --yes` is fast, non-interactive, idempotent-feeling, and prints a clear file-by-file log plus an accurate next-step ("Start with .cleargate/README.md ... file a Story, approve it at Gate 1, then run cleargate push").
- `doctor` / `doctor --session-start` banners are accurate and calm for a fresh, pre-member repo: no false drift warnings, no scary blocked-item noise.
- `.cleargate/README.md` and the CLAUDE.md bounded block are both clear; the next step for a brand-new user is obvious without cross-referencing other docs.
- `cleargate new <type> [--epic ...]` scaffolding is correct and well-namespaced (STORY-001-01/-02 under EPIC-001, STORY-002-01 under EPIC-002); templates are detailed enough that all 6 hand-authored items passed their readiness gate on the **first** attempt, including the epic/story fresh-repo accommodations (`approved_by`+`approved_at` in place of a Proposal/Initiative; "none — net-new" sentinels for Existing Surfaces/Prior work).
- Wiki correctly excludes stories by default and says so explicitly in its own skip message (`wiki ingest: STORY-001-01 skipped (bucket 'stories' not in wiki.ingest_buckets)`); `wiki build`/`wiki lint`/`wiki query` all reflect this consistently.
- `sprint preflight` caught the uncommitted scaffold+items with an actionable, correctly-worded message (`main is dirty` / "Commit, stash, or discard before starting a sprint") before letting `sprint init` proceed.
- The PostToolUse hook chain (stamp → gate → wiki ingest) always exits 0 by design but still surfaces real failures to the agent via `⚠️`-prefixed stdout lines, with a full run log in `.cleargate/hook-log/gate-check.log` — a sensible silent-success/surfaced-failure split.
- Failed script invocations (the first, blocked `sprint init` attempt) are automatically captured to `.cleargate/sprint-runs/_off-sprint/.script-incidents/<ts>-<hash>.json` with full args/stdout/stderr/exit code — a nice debugging trail with no extra effort.
- `cleargate push`'s pre-member membership gate correctly short-circuits with exit 2 and the documented `Run: cleargate join <invite-url>` redirect, with no network call.
- `.gitignore` is sane: per-machine/generated files (`hook-log/`, `.participant.json`, `.sync-marker.json`, `dashboard.html`, `.worktrees/`) are ignored while the wiki, work items, and sprint-runs artifacts remain trackable, matching the "plain markdown, diffs cleanly" design goal.

## Final git status check (meta-repo)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Matches expectation: only the 4 ledger files (pre-existing, session-tracked) are modified in the meta-repo; this report file is the only addition, written under `.cleargate/sprint-runs/SPRINT-41/reports/`. No writes landed anywhere else in the meta-repo or its `cleargate-cli` checkout.

`/private/tmp/cg-s41-fresh-journey` is left in place for re-verification, with 2 commits (initial tinytodo scaffold + ClearGate install/authoring), an active SPRINT-01 (`state.json` at `.cleargate/sprint-runs/SPRINT-01/`), and 3 stories carrying an experimentally-added literal `approved: true` field (added to reproduce/diagnose FJ-1 — see step 10e).

STATUS=done
