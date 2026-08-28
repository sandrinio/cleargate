---
cr_id: CR-107
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (SKILL.md:723 local sprint->main merge; cleargate-enforcement.md:110 walkthrough gate; git remote -v on all three repos) + recorded direct approval 2026-08-26
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:50:14Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T20:50:14Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-107: Sprint→main merge goes through a pull request

> **CITATION REPAIR (orchestrator, 2026-08-29).** The live `.claude/skills/sprint-execution/SKILL.md` had drifted from canonical (777 vs 787 lines) because STORY-054-03's Gate-4 re-sync never ran. Live was re-synced from canonical today and is now byte-identical. Canonical is purely additive over the old live file -- a 9-line `### 2.1 Spikes run before the loop` block after `:99` and one reference line after `:765` -- so every citation in this file below `:100` shifted by +9 and every one below `:766` by +10. Repaired here: `:445`->`:454`, `:714`->`:723`. Each target was re-read after the re-sync and confirmed to carry the quoted text.


## 0.5 Open Questions

- **Question:** Do story→sprint merges also require PRs?
- **Recommended:** No. Explicitly out of scope. A story PR's only real payoff is an independent verifier, and no CI exists in any of the three repos — so story PRs today would mean N branch pushes and N auto-merges by the same system that opened them, verifying nothing. Revisit after CI lands.
- **Human decision:** Sprint→main only — recorded 2026-08-26.

- **Question:** What happens in a target repo with no remote, or a non-GitHub host?
- **Recommended:** The behaviour is config-gated (`vcs.sprint_pr` in `config.yml`) and defaults to `off`. ClearGate installs into other people's repos; a hard requirement would break every install without a GitHub remote. "Mandatory" means mandatory *for this repo*, set per-install.
- **Human decision:** Config-gated, default off, enabled in this repo — recorded 2026-08-26.

- **Question:** Who merges the PR?
- **Recommended:** The human, at Gate 4. The PR is the Gate-4 artifact; merging it *is* the close authorization. This does not add an approval step, it relocates the existing one onto a durable object.
- **Human decision:** Human merges at Gate 4 — recorded 2026-08-26.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that the sprint lands on `main` via a local merge.** `SKILL.md:723` runs `git merge sprint/S-NN --no-ff -m "Sprint S-NN: <goal>"` in the primary checkout. Nothing outside the local machine ever sees the sprint diff as a reviewable object.
- **Forget that the walkthrough gate is self-enforced prose.** `cleargate-enforcement.md:110` states the sprint branch MUST NOT merge to `main` until the walkthrough is complete and every `UR:bug` is resolved. Today the only thing preventing that merge is the orchestrator's own compliance with a sentence in a markdown file.

**New Logic (The New Truth):**

- **When `vcs.sprint_pr` is enabled, the sprint branch is pushed and a PR is opened against `main` at the start of Phase D (walkthrough), not at close.** The PR is the walkthrough surface: the human reads the diff *and* tests the branch, instead of only testing it.
- **The open PR is the physical form of the §2 gate.** An unmerged PR is a visible, external representation of "this sprint has not been accepted." Gate-4 close merges it. The gate stops being a promise and becomes an object with a URL.
- **The PR body is generated from artifacts that already exist** — sprint goal, the DoD checklist, and the `SPRINT-<NN>_REPORT.md` summary. No new authored content, therefore no new token cost.
- **Story→sprint merges are unchanged.** DevOps keeps merging locally, one worktree at a time (`SKILL.md:454`). This CR touches exactly one merge in the whole sprint.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: **Phase D + Phase E of `.claude/skills/sprint-execution/SKILL.md`** — the walkthrough invitation gains a PR link; Gate-4 close merges the PR instead of running `git merge`.
- [ ] Invalidate/Update: **`close_sprint.mjs` Step 2.8** (sprint branch merged to main) — must accept "merged via PR" as satisfying the check, not only a local merge commit.
  **§ AMENDMENT (orchestrator, 2026-08-29, per M4 plan F2a/F2b — a scope CORRECTION, not an
  increase).** Measurement shows the change this row asks for is largely unnecessary and that the
  two changes actually needed are absent from §2 entirely. The Developer must build the latter,
  not the former:
  - **F2a — squash-merge detection.** A PR merged with squash leaves no merge commit, so
    `--is-ancestor` correctly reports "not merged" for a sprint that *was* merged.
  - **F2b — stale local `main`.** `close_sprint.mjs:662` reads `refs/heads/main`, the **local**
    ref. After any PR merge the local ref is behind until the human pulls, so the check reads
    "not merged" on **every** PR-merged sprint. Fetch first, or consult `refs/remotes/origin/main`.
  Keep `--is-ancestor` itself. Note `close_sprint.mjs:659` skips Step 2.8 entirely when the sprint
  id has no numeric portion — a `vcs`-gated path must not be reachable only through that skip.
- [ ] Database schema impacts? **No.**
- [ ] **New external dependency: `gh` CLI + an authenticated GitHub remote.** Must degrade gracefully — when `vcs.sprint_pr` is off, or `gh` is absent, or the repo has no remote, the local-merge path stays exactly as it is today. This is the primary regression risk.
- [ ] **`config.yml` gains a `vcs:` block.** It has none today; this is net-new config surface that must be documented in `config.example.yml`.
- [ ] **Cross-repo caveat:** a framework sprint touches the meta repo *and* `cleargate-cli` (separate repo, own remote). This CR covers the meta repo's sprint branch only. Multi-repo sprint PRs are explicitly out of scope and noted as a known gap.

## Existing Surfaces

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:723` — `git merge sprint/S-NN --no-ff`; the local sprint→main merge this CR routes through a PR.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md:110-138` — the walkthrough gate ("MUST NOT merge to main while any `UR:bug` is unresolved"). This CR gives that rule an enforceable external representation.
- **Surface:** `.cleargate/scripts/close_sprint.mjs:588-631` — Step 2.7/2.8 preflight, already shells out to `git worktree list --porcelain` with a graceful "unavailable → non-fatal skip" fallback. This CR reuses that exact degradation idiom for `gh`.
- **Surface:** `.cleargate/config.yml` — per-repo config; currently has no `vcs:` section. Extended, not replaced.
- **Why this CR extends rather than rebuilds:** The sprint→main merge, the walkthrough gate, and the close preflight all exist and stay. This CR changes *how one merge is executed* and gives an existing prose gate a durable artifact. The graceful-degradation pattern it needs for a missing `gh` binary is already implemented verbatim in `close_sprint.mjs`'s handling of an unavailable `git worktree list`, so the fallback is a copy of a proven surface rather than new error-handling design.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Cut story/CR-107 from sprint/S-39 after BUG-046 merges
- [ ] Verify canonical SKILL.md offsets before editing (N2): expect +9 below :100, +10 below :766
- [ ] QA-Red: author P1-P7 in test_close_pipeline.sh reusing CLEARGATE_FORCE_MERGE_STATUS; P2 asserts exit code
- [ ] close_sprint.mjs Step 2.8: fetch-or-origin/main fallback (F2b) + squash detection (F2a) + vcs gate; keep --is-ancestor
- [ ] Mirror close_sprint.mjs byte-identically into cleargate-planning/
- [ ] Add vcs.sprint_pr to BOTH config.yml files and BOTH config.example.yml files; DO NOT diff them
- [ ] cleargate-planning/.claude/skills/sprint-execution/SKILL.md: §6 Phase D opens the PR; §E.5 merges it (locate by heading)
- [ ] cleargate-enforcement.md §2 + canonical mirror: name the PR as the gate's artefact, byte-identical
- [ ] Run the eviction check on §E.5; run test_close_pipeline.sh; record all numbers

## Prior work

- `cleargate wiki query "sprint branch pull request"` → **none found**.
- Grep of `.cleargate/knowledge/cleargate-protocol.md` for PR concepts: `:13` uses "PR" as a *size* metaphor ("it's a PR or a tiny CR"); `:196` means the ClearGate MCP pull, not a merge request. **ClearGate has no pull-request concept today** — this is net-new vocabulary.
- No `.github/workflows` exists in the meta repo, `cleargate-cli`, or `mcp`. Confirmed by direct `ls`. The absence of CI is what scopes this CR to the sprint merge only.
- Related: [[SPRINT-38]] and [[CR-097]] touch sprint close mechanics but neither introduces remote review.

## 3. Execution Sandbox

**Modify:**
- `.claude/skills/sprint-execution/SKILL.md` — Phase D (open PR at walkthrough) + Phase E (merge PR at Gate 4).
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical mirror.
- `.cleargate/scripts/close_sprint.mjs` — Step 2.8 accepts a PR merge.
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — canonical mirror.
- `.cleargate/config.yml` — add `vcs.sprint_pr`.
- `cleargate-planning/.cleargate/config.yml` + `config.example.yml` — canonical + reference.
- `.cleargate/knowledge/cleargate-enforcement.md` §2 — note the PR as the gate's artifact.
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — canonical mirror.

**Do NOT modify:** DevOps agent, story→sprint merge (`SKILL.md:454`, §C.7), worktree lifecycle.

## 4. Verification Protocol

**Command/Test:** `bash .cleargate/scripts/test/test_close_pipeline.sh`

Required cases:
1. **`vcs.sprint_pr: false`** (default) → close runs the local `git merge` path, byte-identical behaviour to today. Regression guard for every existing install.
2. **`vcs.sprint_pr: true`, `gh` absent** → close halts with a named error naming the missing binary. Never falls through to a silent local merge.
3. **`vcs.sprint_pr: true`, no remote** → same named-refusal path.
4. **`vcs.sprint_pr: true`, happy path** → Step 2.8 recognises a PR-merged sprint branch as satisfied.
5. **PR body generation** is deterministic from sprint goal + DoD + report; no network call required to build it.

**Eviction check:** Phase E contains no unconditional `git merge sprint/S-NN` — the local merge is reachable only on the `vcs.sprint_pr: false` branch.

---

## Context Source

**context_source:** Verified codebase grounding — local merge confirmed at `SKILL.md:723`; walkthrough gate at `cleargate-enforcement.md:110`; absence of CI confirmed by `ls` across all three repos; GitHub remotes confirmed by `git remote -v`. Direct approval recorded 2026-08-26: user selected the sprint→main merge specifically ("the sprint merge is what i mean") after being shown the story-PR alternative and its CI prerequisite.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none; §2 lists surfaces this CR modifies, no downstream work item depends on the local-merge path.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio, in the design conversation that produced this CR.
