---
cr_id: CR-105
parent_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: "Direct human ask 2026-08-26 (\"i think we need to be adding it in the top... i want it to be added to the top to cache it\") following a grounded walkthrough of how init and upgrade rewrite CLAUDE.md. Prompt-caching semantics confirmed against the bundled claude-api reference (prefix match; any byte change invalidates everything after it; render order tools → system → messages; order content by volatility, most stable first) rather than from memory. Grounding: cleargate-cli/src/init/inject-claude-md.ts:41-52, cleargate-cli/src/lib/claude-md-surgery.ts, root CLAUDE.md (block at lines 129-186 of 186)."
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:00:57Z
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
  last_gate_check: 2026-08-25T20:00:57Z
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

# CR-105: The ClearGate block leads CLAUDE.md

## 0.5 Open Questions

- **Question:** Relocation moves any user prose that currently sits above the block down below it. Is that acceptable churn on the first upgrade after this ships?
- **Recommended:** Yes, once, and say so in the upgrade output. The whole point is that the stable half must physically precede the volatile half; preserving the user's chosen order would defeat the change. A one-line notice on the run that relocates is enough.
- **Human decision:** **Relocate once, print a notice** (2026-08-26). The block moves to the top on the next run and stays there; the run emits one line naming how many lines of user content now follow it and why. Preserving a user's chosen position was considered and rejected — the repos whose block sits lowest are exactly the ones the change exists to help, so a preserve-if-content-above rule would skip the cases that matter.

- **Question:** Should relocation apply to `upgrade` as well as `init`, given `upgrade` is a merge path?
- **Recommended:** Yes, but only on the take-theirs branch, and only after BUG-043 lands. `upgrade` is where existing installs actually get the change; restricting it to `init` would mean no existing repo ever benefits.
- **Human decision:** **Both `init` and `upgrade`** (2026-08-26). `upgrade` relocates on its take-theirs branch, strictly after [[BUG-043]] lands. `init`-only was rejected: none of the three known installs would ever receive the change without being re-initialised.

  **Interaction with BUG-043's Q1, recorded so it is not rediscovered:** `upgrade` will refuse a `CLAUDE.md` that has no markers rather than rewrite it. Relocation therefore applies **only where a block is already present** — `upgrade` never creates one. Installing a block into a file that lacks it stays `init`'s job. The two decisions compose without conflict.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The block is appended at the **end** of an existing `CLAUDE.md` when no markers are found (`inject-claude-md.ts:50` — `existing.trimEnd() + '\n\n' + block + '\n'`). Forget "append."
- Replacement is a pure in-place swap that never moves the block. Forget "position is whatever it already was."
- The implicit assumption that block position is cosmetic. It is not — it determines how much of the file sits ahead of the volatile half in the prompt prefix.

**New Logic (The New Truth):**
- The ClearGate block is **always the first content in `CLAUDE.md`.** One contract for every path: if a block exists, remove it; then prepend the current block; user content follows.
- Rationale is prompt caching, and it is mechanical rather than aesthetic. Caching is a prefix match — any byte change at position N invalidates everything from N onward — so content must be ordered by volatility, most stable first. The ClearGate block changes only on upgrade; the user's own prose (stack versions, dated "active state" notes, deploy targets) changes far more often. Today the volatile half leads: in this repo the block is lines 129–186 of 186, so every edit to the first 128 lines re-processes the block behind it.
- Relocation is therefore part of the contract, not an incidental side effect. An in-place replace that leaves the block at the bottom does not deliver the change.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Bug: [[BUG-043]] — **hard predecessor, not merely related.** Remove-then-prepend runs the greedy `BLOCK_REGEX` over the file deliberately and on every run. Shipping relocation on top of the unfixed regex converts an occasional hazard into a routine one, so BUG-043 must merge first.
- [ ] Invalidate/Update Epic: [[EPIC-054]] — no scope change. This CR is scheduled alongside it in SPRINT-39 and touches a module no EPIC-054 story touches.
- [ ] Downstream repos: every repo that runs `cleargate init` or `cleargate upgrade` after this ships gets its block relocated once. `doc_processor`, `new_app`, and this meta-repo are the known installs.
- [ ] Database schema impacts? No — no runtime or persistence surface.
- [ ] `.cleargate/.install-manifest.json` records a sha per tracked file. Relocation changes `CLAUDE.md`'s content, so the snapshot entry must be updated by the same run or the next `upgrade` reports spurious drift.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:41` — `injectClaudeMd`, the three-branch install path (create / replace-in-place / append). The append branch is the one this CR replaces with prepend.
- **Surface:** `cleargate-cli/src/lib/claude-md-surgery.ts` — `readBlock` / `writeBlock` / `removeBlock`. `removeBlock` already implements the "strip the block, keep the rest" half of the new contract; this CR composes it with a prepend rather than writing new extraction logic.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts` — the take-theirs branch that applies CLAUDE.md surgery during a merge.
- **Surface:** `cleargate-cli/src/commands/init.ts` — calls `extractBlock` then `injectClaudeMd`; the call site that must adopt the new contract.
- **Surface:** `cleargate-cli/src/lib/drift-check.ts` — imports `readBlock`; reads the block for drift comparison and is position-independent, so it needs no change. Cited to record that it was checked.
- **Why this CR extends rather than rebuilds:** every piece already exists — `removeBlock` strips, `extractBlock` supplies the new block, and `injectClaudeMd` owns the write. The change is to compose them in a different order and delete the append branch. No new module, no new regex, no new file format.

## Prior work

- [[BUG-043]] — the marker-handling defects in the same two modules. Hard predecessor; see §2.
- [[EPIC-054]] — parent epic; scheduled together in SPRINT-39.
- [[CR-099]] — Dogfood Split Integrity. Established that the live `.claude/` tree is untracked and canonical is the source; relevant because this CR changes a file that exists in both trees.
- No prior item changes CLAUDE.md block placement or addresses prompt-cache prefix stability. `cleargate wiki query` returned no matches.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/init/inject-claude-md.ts` — replace the append branch with prepend; make replacement relocate rather than swap in place.
- `cleargate-cli/src/commands/init.ts` — adopt the new contract at the call site.
- `cleargate-cli/src/commands/upgrade.ts` — apply relocation on the take-theirs branch, after BUG-043's fix.
- `cleargate-planning/CLAUDE.md` — canonical payload; no content change, but confirm the block is the first content so the shipped source models the contract.
- `CLAUDE.md` — this repo's own root file; relocate the block to lead, dogfooding the change.
- New `*.node.test.ts` under `cleargate-cli/test/`.

**Do NOT modify:**
- `cleargate-cli/src/lib/drift-check.ts` — position-independent, verified.
- `cleargate-cli/src/commands/uninstall.ts` — `removeBlock` semantics are unchanged by this CR.
- The `BLOCK_REGEX` definitions — BUG-043 owns those.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

New logic proven:
- Given a `CLAUDE.md` with user prose and **no** block, the result starts with `<!-- CLEARGATE:START -->` and retains every byte of the user's prose below it.
- Given a `CLAUDE.md` whose block sits at the **bottom**, the result has the block at the top, the user's prose intact below it, and exactly one block in the file.
- Given a file already in the new shape, the operation is **idempotent** — byte-identical output on a second run.
- Given a block replacement, the new block's content is present and the old block's content appears nowhere in the file.

Old logic evicted:
- Assert no code path appends the block after user content: a fixture with prose and no markers must never produce output whose final non-empty line is the END marker.
- Assert the install manifest sha for `CLAUDE.md` is refreshed by the run that relocates, so a follow-up `upgrade` reports no drift.

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Direct human ask 2026-08-26 after a grounded walkthrough of `init` and `upgrade` CLAUDE.md handling. Caching semantics taken from the bundled claude-api prompt-caching reference, not from memory. The volatility argument is grounded in this repo's own file: block at lines 129–186 of 186, i.e. the stable half currently trails the volatile half.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**Signed off 2026-08-26.** All six criteria met literally *and* both §0.5 Open Questions carry recorded human decisions — relocate once with a printed notice, applied by both `init` and `upgrade`. The earlier 🟡 was held deliberately: the boxes were already all checked, and going green on box-count while §0.5 was open would have been exactly the interpretive leap the gate exists to catch.
