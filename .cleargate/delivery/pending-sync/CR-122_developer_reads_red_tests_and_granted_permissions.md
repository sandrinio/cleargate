---
cr_id: CR-122
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
approved: false
context_source: "2026-09-06 audit: developer.md:124 bans Read on red tests with no enforcement path; protocol §22:833-841 grants seven permissions never surfaced to the agent; developer.md:107 and :159-160 carry two contradictory retry caps"
area: sprint-execution,agent-prompts,developer,autonomy
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:40:31Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-122
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:40:31Z
  sessions: []
---

# CR-122: The Developer May Read Its Own Spec, and Is Shown the Permissions It Already Has

## 0.5 Open Questions

- **Question:** Does letting the Dev read the red tests weaken the "cannot rewrite the spec to make it pass" guarantee?
- **Recommended:** No. That guarantee is enforced by staging inspection, not by ignorance — `pre-commit-surface-gate.sh` inspects `git diff --cached --name-only --diff-filter=M`. The Edit/Write/stage ban is retained in full; only the word `Read` is removed. Note separately that the enforcement regex is itself narrower than believed — see §2 and [[BUG-089]] candidate in §2.
- **Human decision:** {populated during Brief review}

- **Question:** Which of the two contradictory retry caps survives?
- **Recommended:** The Circuit Breaker at `:158-160`. It is the better-specified of the two and the one `SKILL.md` §C.8 routes on.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The word `Read` in `developer.md:124` — "These files are **immutable** for Developer dispatches. Do not Read, Edit, Write, or stage them". The Read ban was never enforceable: the only enforcement anywhere is `pre-commit-surface-gate.sh` inspecting staged modifications, and `pre-edit-gate.sh` hard-bypasses whenever `.cleargate/sprint-runs/.active` exists — i.e. during every sprint. It is an unenforced instruction that costs real inference: the red test **is** the Dev's spec in executable form, and the contract forbids it to look, so the Dev reconstructs assertion semantics from `cleargate gate test` failure output instead of reading three lines of source.
- `developer.md:107` — "If you exceed 2 failed test-run cycles, stop and return `BLOCKED`". It contradicts the Circuit Breaker at `:158-160` (~50 tool calls, or 2 *consecutive identical* failures) and is the tighter of two caps for the same behaviour. It counts non-identical failures during a normal TDD cycle, against tests the Dev did not write and may not modify.
- The implicit claim that `breaker_hits` is enforced. It appears in zero `state.json` files across every sprint despite being a required verdict field and despite `SKILL.md` asserting "3 circuit-breaker hits → Escalated". No script writes it. The numeric limit is decorative.

**New Logic (The New Truth):**

- `developer.md:124` reads "Do not Edit, Write, or stage them". The Dev may read its own executable spec.
- A `**You decide these without escalating:**` block is **APPENDED** beneath the existing `## Autonomy Contract`, carrying protocol §22:833-841's seven-item `### Not blockers — agent decides` list verbatim: choice between two implementations that both meet the Gherkin; test-pattern selection within repo precedent; wording/UX copy; refactor-or-not within the touched surface; library version within the Architect's pre-validated table; error-message phrasing; log-line format. The same append lands in `qa.md`.
- `update_state.mjs` gains a `--breaker-hit` handler mirroring the existing `--qa-bounce`, so the one surviving limiter is actually recorded.

**Why this is the freedom axis, honestly scoped.** `developer.md` carries 26 prohibition tokens against one line of permission language, and cites protocol §22 while reproducing only its prohibitive half plus "do not interpret silence as permission". The permission half already exists, already approved, and the Dev has never been shown it. Two mutually inconsistent numeric caps plus zero visible grants teaches a Sonnet-class model that numbers here are decorative and that the safest available action is to halt. The larger freedom lever — letting the Dev work anywhere inside its declared §3.1 surface — is deliberately **excluded**: `file_surface_diff.sh` selects the story to enforce with `state in ('In Progress','Ready','In Review')`, none of which is in the v3 state vocabulary, so it always falls through to `max(updated_at)`; and `find_story_file` globs `STORY-${id#STORY-}_*.md`, so every BUG/CR item exits 0. BUG-052 and BUG-059 are already filed against it. Repairing that gate is the real prerequisite and is a separate work item.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none.
- [ ] Invalidate/Update Epic: none.
- [ ] Database schema impacts? No. `state.json`'s `StoryEntry` is already `additionalProperties: true`, so `breaker_hits` needs no `state.schema.json` change.

**Follow-on to file, not fix here:** `pre-commit-surface-gate.sh:11` matches `\.red\.(node\.)?test\.ts$`, which does **not** match `*.red.integration.node.test.ts` (the form CR-111 made canonical) nor any of the 12 tracked `*.red.sh` harnesses; and `cleargate-cli` has no hook chain installed at all (`core.hooksPath` unset, `.git/hooks/` holds only samples) while holding ~66 of ~72 red files. The retained Edit/Write/stage ban is therefore honour-system in practice. That is a separate bug — widening the regex newly protects the canonical `*.red.sh` mirrors and would make legitimate DevOps re-sync commits hit `[red-gate] REJECT`, and CR-087 forbids a second bypass beside `SKIP_RED_GATE=1`. Do not bundle it.

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/cleargate-protocol.md:833-841` — the `### Not blockers — agent decides` list, seven items, already written and approved.
- **Coverage of this requirement:** ~90% — the content exists verbatim; this CR only surfaces it into the agent prompt that cites the same section's prohibitive half.
- **Surface:** `.claude/agents/developer.md:124` — the Forbidden Surfaces line carrying the unenforceable Read ban.
- **Coverage of this requirement:** none — this is the string being corrected.
- **Surface:** `.claude/agents/developer.md:158-160` — the Circuit Breaker, the surviving cap.
- **Coverage of this requirement:** partial — correct mechanism, unrecorded outcome.
- **Surface:** `.cleargate/scripts/update_state.mjs` — the existing `--qa-bounce` handler this CR mirrors for `--breaker-hit`.
- **Coverage of this requirement:** partial — the pattern exists; one more flag joins it.

## Prior work

- none found for surfacing granted permissions — the `cleargate-wiki-query` pass returned no prior item.
- [[CR-043]] — Red/Green TDD discipline. Owns red-test immutability; this CR narrows the ban to Edit/Write/stage without touching the immutability guarantee.
- [[CR-081]] — Completed. The red-now-green clause: a red test that passes against the Dev's commit is its own green. Consistent with letting the Dev read it.
- [[EPIC-044]] — Completed, "Agent Dispatch Reliability & Token Efficiency". Prompt/dispatch structure; adjacent.

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/agents/developer.md` and live — delete `Read, ` at `:124`; delete `:107`; append the permissions block beneath `## Autonomy Contract`
- `cleargate-planning/.claude/agents/qa.md` and live — append the same permissions block
- `.cleargate/scripts/update_state.mjs` and canonical — add `--breaker-hit`

**Do NOT modify:**
- The `## Autonomy Contract` block itself. It must stay byte-intact and the new block APPENDED beneath it. `autonomy-contract.red.node.test.ts` is 30/30 green and asserts canonical `developer.md` contains the literals `Autonomy Contract`, `MUST NOT` and `AskUserQuestion`; it is a sealed `*.red.node.test.ts` under CR-043, so a Developer implementing this cannot legally amend it and would return BLOCKED.
- `## Lane-Aware Execution` — `agent-developer-section.integration.node.test.ts` pins it with five literal strings.
- `developer.md:91`'s CR-111 naming prose — `test-layers-declared-doctrine.red.node.test.ts` T7 pins it.
- `pre-commit-surface-gate.sh` — see §2; separate item.

## Task Breakdown

- [ ] Delete `Read, ` from `developer.md:124`, canonical and live
- [ ] Delete the contradictory cap at `developer.md:107`, canonical and live
- [ ] Append the seven-item permissions block beneath `## Autonomy Contract` in `developer.md`, byte-intact above it
- [ ] Append the same block to `qa.md`
- [ ] Add `--breaker-hit` to `update_state.mjs` mirroring `--qa-bounce`
- [ ] Run `autonomy-contract.red.node.test.ts`, `agent-developer-section.integration.node.test.ts` and `test-layers-declared-doctrine.red.node.test.ts` before committing
- [ ] Mirror canonical → live for both agent files

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli run test:file -- test/scripts/autonomy-contract.red.node.test.ts` plus `bash .cleargate/scripts/test/cr122_permissions_surfaced.red.sh`

Asserts: `developer.md:124` no longer contains `Do not Read`; it still contains `Edit, Write, or stage`; the seven §22 permission items appear verbatim in both `developer.md` and `qa.md`; only one retry cap remains; `update_state.mjs --breaker-hit` increments `breaker_hits`; and all three pinned test files stay green.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | `update_state.mjs --breaker-hit` increments and persists |
| Integration tests | 0 | No Postgres/Redis surface; agent prompts are markdown |
| E2E / acceptance tests | 5 | Read-ban removed; Edit/Write/stage ban retained; seven items present in both agents; single surviving cap; pinned tests green |

## Context Source

**context_source:** 2026-09-06 execution-efficiency and Dev-context audit. Verified: `developer.md:124` identical in both trees; `pre-edit-gate.sh` bypasses whenever `.active` exists; protocol §22:833-841 lists exactly seven agent-decides items; `developer.md:107` and `:159-160` are two caps for the same behaviour; `breaker_hits` written by no script and present in zero `state.json` files.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(None impacted; the surface-gate regex gap in §2 is recorded as a separate follow-on, not a downstream invalidation.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> The single unchecked box is the Gate-1 human decision, plus the two §0.5 questions.
