---
cr_id: CR-105
parent_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: "Direct human ask 2026-08-26 (\"i think we need to be adding it in the top... i want it to be added to the top to cache it\") following a grounded walkthrough of how init and upgrade rewrite CLAUDE.md. Prompt-caching semantics confirmed against the bundled claude-api reference (prefix match; any byte change invalidates everything after it; render order tools → system → messages; order content by volatility, most stable first) rather than from memory. Grounding: cleargate-cli/src/init/inject-claude-md.ts:45-58, cleargate-cli/src/lib/claude-md-surgery.ts, root CLAUDE.md (block at lines 129-186 of 186)."
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
- The block is appended at the **end** of an existing `CLAUDE.md` when no markers are found (`inject-claude-md.ts:57` — `existing.trimEnd() + '\n\n' + block + '\n'`). Forget "append."
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

- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:45` — `injectClaudeMd`, the three-branch install path (create / replace-in-place / append). The append branch is the one this CR replaces with prepend.
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
- `cleargate-cli/src/commands/init.ts` — **§3 AMENDMENT (orchestrator, 2026-08-28, per BUG-043
  post-flight P7(d)). The original justification was FALSE; the row itself is not.** *"Adopt the
  new contract at the call site"* is measurably wrong and the M3 plan says so in bold — the call
  site at `:371-388` needs no change, because `injectClaudeMd` owns the contract and its signature
  is unchanged. The file stays in scope for a different reason: §0.5 Q1's recorded human decision
  — *"relocate once, print a notice"* — has no other implementation site. The only viable one is
  the stdout branch at **`init.ts:390-396`**. Deleting this row would drop a recorded human
  decision on the floor; keeping the old justification would send a Developer to the wrong lines
  and it would conclude the file needs nothing. Both statements are true and both must be printed.
- `cleargate-cli/src/commands/upgrade.ts` — apply relocation on the take-theirs branch, after
  BUG-043's fix. **Named to the line by BUG-043 post-flight P9:** the branch survived BUG-043
  intact, and its single write is now `mergedContent = writeBlock(ours, theirBlock);` at
  **`:381`** — an in-place swap that never moves the markers. Replace **that one line** with
  `injectClaudeMd(ours, extractBlock(theirs))`; do not re-derive the marker concatenation. Do not
  touch the two refusal returns (`:371-377`, `:378-380`), the `catch` (`:382-388`), or the
  `isClaudeMd` guard (`:364`). **This branch is latent, not live** — `CLAUDE.md` is in
  `INTENTIONALLY_UNTRACKED` (`build-manifest.ts:334`) and has never been a manifest row, so the
  change delivers nothing observable today. Record it as defense-in-depth; do not report it as a
  shipped behaviour change.
- `cleargate-planning/CLAUDE.md` — canonical payload. **§3 AMENDMENT (orchestrator, 2026-08-28):
  the original row was WRONG, not merely incomplete.** It said "no content change, but confirm the
  block is the first content." Measured: the file is 64 lines with `<!-- CLEARGATE:START -->` at
  **`:7`** — six lines of payload-wrapper preamble precede it (`# ClearGate — Injected CLAUDE.md
  Block`, the explanatory paragraph, and a `---`). Those must **stay**: `extractBlock` ships only
  the bounded block, so the preamble never reaches a downstream repo. **"Confirm the block is the
  first content" can only fail.** A content change *is* required: `:3` reads *"…If one already
  exists, init **appends** the bounded block below without touching the user's existing content."*
  — verbatim the obsolete logic §1 evicts. Rewrite that sentence to describe prepend-and-relocate;
  do **not** move the markers.
- `cleargate-cli/src/init/inject-claude-md.ts:11` — **added by the same amendment.** Its docstring
  carries the same stale contract (`- If existing no match:  append block with 2 leading newlines
  (preserve user content above)`). It is one line above the code §1 changes and would otherwise
  ship describing the evicted behaviour.
- `CLAUDE.md` — this repo's own root file; relocate the block to lead, dogfooding the change.
- New `*.node.test.ts` under `cleargate-cli/test/`, plus a doc-truth red file (see §4).
- `cleargate-cli/test/commands/init.node.test.ts` — **the one and only existing red, measured on
  top of shipped BUG-043 (post-flight P5).** Scenario 3, *"existing CLAUDE.md without markers —
  appends bounded block, preserves user content"*, at **`:299-319`**, fails on
  `assert.ok(startIdx > userIdx)` at **`:314`** the moment relocation lands. That is correct: the
  assertion pins the behaviour §1 evicts. Rewrite the assertion and retitle. Scenario 4 at
  **`:323-346`** stays green but its title also says "appends" — retitle only.
- `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:109` — green under CR-105 (it
  asserts `countAnchoredLines(...) === 1`, a grammar property, not an append shape), but its title
  still reads *"— appends instead"*. Retitle only. The file did not exist when this CR was
  drafted; it shipped with BUG-043.
- `cleargate-cli/test/commands/upgrade-claude-md.red.node.test.ts:10` — comment-citation repair,
  routed here from TPV R13(a) via post-flight P10. The comment cites `upgrade.ts:364-378`; the real
  post-fix range is `try` at **`:368`** through the `catch` closing at **`:388`**. Comment only, no
  assertion changes. **R13(b) was measured WRONG — do not act on it.** It claimed this plan's
  `uninstall.ts:437-441` citation was off by one; direct read gives `try :436`, `removeBlock :437`,
  `writeAtomic :438`, `push :439`, `catch :440-442`. The original citation is correct and
  `uninstall.ts` stays untouched.
- `cleargate-cli/CHANGELOG.md` — **added by BUG-043 post-flight P3.** Read by users *and* printed
  by `cleargate upgrade`. Two entries belong here and neither is optional: (1) relocation itself,
  which moves every existing install's block once and must be announced before it happens; (2)
  BUG-043's residual known limitation — a stray `<!-- CLEARGATE:END -->` alone on its own line
  still extends the greedy match and eats the prose after it, tracked as [[BUG-061]]. That residual
  currently exists only in a test title, which is not a place any user will look. The accompanying
  version bump is a Gate-4 release step, not this CR's — leave `package.json` alone.

**Do NOT modify:**
- `cleargate-cli/src/lib/drift-check.ts` — position-independent, verified.
- `cleargate-cli/src/commands/uninstall.ts` — `removeBlock` semantics are unchanged by this CR.
- The `BLOCK_REGEX` definitions — BUG-043 owns those, and it shipped them anchored on 2026-08-28.
- `cleargate-cli/src/init/root-gitignore.ts` — carries a THIRD bounded-marker grammar
  (`ROOT_BLOCK_REGEX`, `:41`), still unanchored and greedy. Out of scope here; owned by [[CR-113]].
- `cleargate-cli/package.json` — the version bump belongs to the Gate-4 release, not to this CR.

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

**§4 AMENDMENT (orchestrator, 2026-08-28, per BUG-043 post-flight P8). A red baseline IS authorable
for the outer half — the M3 plan's "there is nothing to write" is wrong, and QA-Red is dispatched
for both halves.** Three doc-truth assertions, all measured on the current tree. The file lands in
the **cli** commit (precedent: `test/scripts/template-claude-md.node.test.ts:16` resolves a
module-relative `REPO_ROOT` and reads both `CLAUDE.md` files; `test/scaffold/enforcement-doc-coherence.node.test.ts:45-51`
does the same behind a `CLEARGATE_META_ROOT` override; `test/docs/dogfood-split-integrity.node.test.ts:96-103`
asserts phrase presence in root `CLAUDE.md`). The outer commit still carries no test files.

- **RED today:** root `CLAUDE.md`'s first non-empty line is `<!-- CLEARGATE:START -->`. Measured:
  `"# ClearGate Meta-Repo"`.
- **RED today:** `cleargate-planning/CLAUDE.md:3` contains no `"appends"`. Measured: it reads
  *"…If one already exists, init **appends** the bounded block below without touching the user's
  existing content."*
- **GREEN today and it must STAY green:** the bounded block is byte-equal between the two trees
  (measured 11808 chars with markers = 11762 body + 46). Relocation moves the block; it must not
  edit it.

**Expected suite delta, re-measured on top of shipped BUG-043 — do not inherit any earlier figure.**
Control `138/138/0/0` → CR-105 cli half `138/137/1/0` → plus relocated root `CLAUDE.md` (15 files)
`215/212/1/2`. Exactly one pre-existing test goes red (`init.node.test.ts` scenario 3); the census is
complete rather than sampled, because `claude-md-anchoring.red.node.test.ts` is the only test file in
the tree that imports `injectClaudeMd` or `extractBlock`. A separate doc-truth batch shows nine
failures **in an out-of-tree mirror only**, byte-identical under both the patched and unpatched
control — mirror artefacts, invariant under this CR, absent from the real checkout. Do not chase them.

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
