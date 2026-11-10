---
bug_id: BUG-086
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
severity: P2-Medium
ambiguity: 🟡 Medium
approved: false
context_source: "SPRINT-39 DevOps blocker census (2026-09-06 execution-efficiency audit): 2 of 4 blockers are orchestrator-authored dirt, not merge conflicts; verified .cleargate/wiki/** absent from surface-whitelist.txt"
area: sprint-execution,devops,merge,hooks
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:35:57Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-086
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:35:56Z
  sessions: []
---

# BUG-086: DevOps Story Merges Fail on the Orchestrator's Own Wiki Dirt

### Open Questions

- **Question:** Should the pending-sync half of this (uncommitted work-item files blocking a merge) be handled by the same stash?
- **Recommended:** No. A dirty `pending-sync/*.md` is authored content — CR-111's DevOps correctly judged its dirty file "real authored content — an orchestrator TPV amendment". The rule there is "commit the in-flight work-item file before dispatching DevOps", never "stash". Only `.cleargate/wiki/**` is hook-generated and safe to stash.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When `git merge-tree` reports no conflict between a story branch and the sprint branch, the DevOps merge dispatch completes and the story lands.

**Actual Behavior:** The merge aborts because the shared checkout carries uncommitted changes to `.cleargate/wiki/index.md`, `.cleargate/wiki/log.md` and `.cleargate/wiki/product-state.md` — files the orchestrator's own PostToolUse hook rewrote, not files the story touched. DevOps writes a blockers report and halts, and the serial loop stops until a human reads it.

## 2. Reproduction Protocol

- Start a sprint; confirm `.cleargate/sprint-runs/.active` is set.
- From the main checkout, Edit or Write any file under `.cleargate/delivery/**`. This fires `PostToolUse` on `Edit|Write` → `stamp-and-gate.sh` → `cleargate wiki ingest`, which rewrites `.cleargate/wiki/index.md`, `log.md` and `product-state.md`.
- Do not commit those three files.
- Dispatch DevOps to merge any story branch into the sprint branch.
- Observe: `git merge-tree` reports zero conflicts, but `git merge` aborts with `error: Your local changes to .cleargate/wiki/index.md would be overwritten by merge`.
- Observe: attempting the documented remedy — committing the wiki files — trips the pre-commit surface gate, because `.cleargate/wiki/**` is not in `surface-whitelist.txt` and is not in the story's §3.1 declared surface.

## 3. Evidence & Context

```
--- .cleargate/sprint-runs/SPRINT-39/reports/CR-108-devops-blockers.md
error: Your local changes to the following files would be overwritten by merge:
	.cleargate/wiki/index.md
	.cleargate/wiki/log.md
	.cleargate/wiki/product-state.md
Please commit your changes or stash them before you merge.
(git merge-tree independently confirmed zero conflicts)

--- .cleargate/sprint-runs/SPRINT-39/reports/CR-111-devops-blockers.md
"not caused by anything DevOps did; the dirty state predates this dispatch"

--- CR-108 dispatch timestamps: three DevOps spawns for one merge
21:30:43Z, 21:36:11Z, 22:01:52Z

--- .cleargate/scripts/surface-whitelist.txt (verified 2026-09-06)
cleargate-planning/MANIFEST.json
.cleargate/hook-log/*
.cleargate/sprint-runs/**/token-ledger.jsonl
.cleargate/sprint-runs/**/.pending-task-*.json
.cleargate/sprint-runs/**/state.json
.cleargate/hook-log/gate-check.log
# .cleargate/wiki/** is ABSENT — while every other hook-written derived
# surface above has a row for exactly this reason.
```

Context: `CLAUDE.md` declares the wiki a derived cache ("Wiki, memory, and `context_source` are derived caches"). Derived caches are precisely what the whitelist exists to admit.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/surface-whitelist.txt`
- `cleargate-planning/.cleargate/scripts/surface-whitelist.txt`
- `cleargate-planning/.claude/agents/devops.md` (step 2 only)
- `.claude/agents/devops.md` (step 2 only)

**Do NOT modify:**
- `SKILL.md` §C.7's preamble. The stash must live inside the agent's own step 2, not in the orchestrator's preamble — `.claude/settings.json` wires PostToolUse on `Edit|Write` to `stamp-and-gate.sh`, so a preamble stash has a re-dirty window that an in-turn stash does not.
- The genuine-conflict escalation path. A non-empty `git merge-tree` must still halt, still write `<ID>-devops-blockers.md`, and still never auto-resolve.

## Task Breakdown

- [ ] Add `.cleargate/wiki/**` to `.cleargate/scripts/surface-whitelist.txt` with a comment matching the existing derived-output rows
- [ ] Mirror to `cleargate-planning/.cleargate/scripts/surface-whitelist.txt`
- [ ] Add the `git stash push --include-untracked -- .cleargate/wiki/` / `git stash pop` pair to `devops.md` step 2, canonical and live
- [ ] Add an explicit note that dirty `pending-sync/*.md` is authored content and must be committed, never stashed
- [ ] Write the failing test proving a wiki-dirty checkout blocks a conflict-free merge
- [ ] Confirm the genuine-conflict path still halts

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug086_wiki_dirt_merge.red.sh`

The red test builds a `mktemp -d` git fixture with a story branch and a sprint branch that do not conflict, dirties `.cleargate/wiki/index.md`, attempts the merge, and asserts the pre-fix abort. Post-fix it asserts the merge completes and that a *conflicting* merge still aborts.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No function changes — a whitelist data row plus agent prose |
| Integration tests | 0 | Covered by the bash harness below; no Postgres/Redis surface involved |
| E2E / acceptance tests | 3 | conflict-free merge with dirty wiki succeeds; genuine conflict still halts; whitelist admits a staged wiki file |

---

## Prior work

- none found — the `cleargate-wiki-query` pass returned `none found` for surface-whitelist and wiki-dirty issues.
- [[CR-079]] — adjacent, not overlapping. Established `worktree.provision_config` and the `stray_env_files` scan-exemption pattern (one configured list serving as both spec and exemption). This bug applies the same "derived output belongs on the whitelist" principle to the wiki.
- [[STORY-051-01]] — Completed. Restored the file-surface gate that this bug's whitelist row is admitted through.

## Context Source

**context_source:** SPRINT-39 DevOps blocker census performed 2026-09-06. 2 of 4 blockers (CR-108, CR-111) are orchestrator-authored dirt rather than code defects; CR-108 alone consumed three DevOps spawns. `surface-whitelist.txt` verified to lack `.cleargate/wiki/**` while carrying rows for every other hook-written derived surface.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

> The single unchecked box is the Gate-1 human decision itself and is the only thing holding this at 🟡. Flip `approved: true` at Brief sign-off and this goes 🟢 with no other edit.
