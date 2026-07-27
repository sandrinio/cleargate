---
story_id: STORY-051-09
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: SPRINT-33
carry_over: false
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (docs)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:17:07Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-5
  last_stamp: 2026-07-27T13:16:37Z
  sessions:
    - session: ef81765d-88a0-4931-a963-4c83e79ea0e6
      model: <synthetic>,claude-opus-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-07-27T13:03:26Z
---

# STORY-051-09: Fix Doc Contradictions, Gate-Numbering Canon & Phantom References
**Complexity:** L3 — adopt protocol §4's four-gate model as the repo-wide numbered spine, re-map every three-gate reference onto it, and clear a batch of phantom paths / stale comments / an orphaned test across the doc + scaffold corpus.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer working the docs, I want the gate numbering to mean exactly one thing everywhere and every doc-internal reference to point at something that actually exists, so that an agent reading CLAUDE.md, the protocol, or a script comment is never routed by a stale flow, a phantom path, or a dead file — the P2 coherence layer of the post-CR-074 enforcement-integrity restoration.

### 1.2 Detailed Requirements
- **R1 — Four-gate spine adopted as canon.** Protocol `cleargate-protocol.md` §4 ("The Four Gates": Gate 1 = Brief/ambiguity per work item, Gate 2 = Sprint-Ready, Gate 3 = Sprint Execution, Gate 4 = Close-Ack) is the numbered spine repo-wide. §4's structure is NOT renumbered — every OTHER reference is re-mapped onto it.
- **R2 — Re-map the two CLAUDE.md three-gate references.** In root `CLAUDE.md:150` and canonical `cleargate-planning/CLAUDE.md:28`, the sentence "You halt at Gate 1 (Initiative approval) and Gate 2 (Ambiguity resolution)" is re-mapped onto the four-gate spine: Initiative approval is the intake step *before* Gate 1; Ambiguity resolution *is* Gate 1 (Brief); Push is the action fired when Gate 1 goes green. No box is renamed "Gate 2 (Ambiguity)" — Gate 2 is Sprint-Ready.
- **R3 — Fix protocol §9 stale pre-CR-025 flow + numbering.** The §9 "Quick Decision Reference" ASCII flow no longer mandates an approved Initiative for all work (Initiative is optional per CR-025 / §3); work items are drafted directly into their template and halt at **Gate 1 (Brief)**, not "Gate 1 (Initiative) / Gate 2 (work-item ambiguity)".
- **R4 — Re-map the protocol wiki-lint three-gate references.** In §10.2 (line 254), §10.8 (lines 348-349), §10.9 (line 369), and §12.6 (line 512): "Gate 1 (Initiative approval)" → "Gate 1 (Brief)"; "Gate 3 (Push)" → the Gate-1-green push (`cleargate_push_item`); "Gate 2 (Ambiguity)" → "Gate 1 (Brief)". After this, no doc names an unnumbered "Initiative approval" or "Push" as a numbered gate.
- **R5 — Fix the two `.cleargate/plans/` phantom paths.** Protocol §6 (line 161) and §8 (line 183) point pulled initiatives at `.cleargate/plans/`; the real destination is `.cleargate/delivery/pending-sync/` (per §4 line 111 + CLAUDE.md Initiative Intake). Both are corrected.
- **R6 — Strike the `triage-classifier.ts` phantom.** `mid-sprint-triage-rubric.md` lines 13 and 155 cite `cleargate-cli/src/lib/triage-classifier.ts`, deleted in SPRINT-33 (STORY-043-09) as a zero-caller orphan. Both references are struck and re-pointed at the authoritative rubric doc itself plus the protocol §2 Classification Table (the classification is now a rubric/heuristic step, not a deleted module).
- **R7 — Fix Bug.md Brief anchors.** `Bug.md`'s `<instructions>` POST-WRITE BRIEF list cites `§0.5 Open Questions` and `§2 Impact` — neither exists in the template body (Open Questions is the unnumbered `### Open Questions` heading; §2 is "Reproduction Protocol"; there is no "Impact" section). Each Brief anchor is re-mapped to a heading present verbatim in the Bug.md body.
- **R8 — Reconcile the launch_wave header/function contradiction.** `launch_wave.mjs`'s module header (line 11: "This launcher IS the execution path: every wave runs through it") and direct-run banner (line 313) contradict its own function-level comments (line 227 "next-sprint surface; not exercised this sprint", line 250 "SPRINT-32 runs serial — no real dispatch", line 276, lines 307-308 "no live wave to drive in this sprint … informational only"). The stale sprint-relative function/inline comments are aligned to the header's CR-074-settled protocol-§23 claim. **No executable line changes** (behavior is out of scope — CR-074 settled).
- **R9 — Remove the orphaned RED test.** `close_sprint.deferred-verify.red.node.test.ts` is a stale CR-082 RED-TDD artifact — the feature it proved-absent shipped (`close_sprint.mjs` Step 2.9, `qa.md` PASS-PENDING-SMOKE, `story.md` `deferred_verification`) and no runner globs `.cleargate/scripts/`; it also improperly ships in the npm payload. It is deleted from all three scaffold copies (canonical + live-root + payload). (Re-home alternative surfaced in §1.4.)
- **R10 — Fix the autonomy-hook `.agent` key.** `pre-tool-use-autonomy.sh:53` reads `jq -r '.agent // "unknown"'`; the dispatch payload carries `agent_type` (verified against a real `.dispatch-*.json`, `write_dispatch.sh`, and the correct read at `token-ledger.sh:191`), so every logged warning attributes to "unknown". Change `.agent` → `.agent_type`.
- **R11 — Dogfood sync + no dead-vocab regression.** Every canonical edit under `cleargate-planning/**` is re-synced to the live-root copy and the npm payload (via `npm run prebuild` in the cli repo); this story introduces **no** new `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` tokens (the vocabulary sweep is STORY-051-05's — see §1.3).

### 1.3 Out of Scope
- The `execution_mode` / v1 / v2 vocabulary sweep across docs/agents/templates/script comments — that is **STORY-051-05**. This story coordinates edits to the shared `cleargate-protocol.md` and both `CLAUDE.md` files (§1.5 collision risk) but does **not** delete v1/v2 vocab strings (e.g. protocol §4 line 119, §12.4 line 503, CLAUDE.md "block in v2" / "under v2" / the root "Sprint mode. Read `execution_mode:`" paragraph). It only re-maps the gate *numbering*.
- Any change to `launch_wave.mjs` **behavior**, the five-agent loop, or the `/workflows` wave path (CR-074 settled — comment reconciliation only).
- Adding a real predicate to the duplicate-check / Ambiguity Gate overclaims (STORY-051 P1 stories) or the CLEARGATE_ADVISORY / `--assume-ack` reconciliation (sibling stories).
- Any renumber of protocol §4 itself (it is the spine being adopted, not edited structurally).
- Restoring or re-implementing the deleted `triage-classifier.ts` module.

### 1.4 Open Questions
> Q5 (gate-numbering canon) is RESOLVED — recorded below as the Human decision. One NEW question surfaced while drafting (orphan-test disposition). No unclean gate mapping was found: the recommended mapping (Initiative approval = intake before Gate 1; Ambiguity = Gate 1; Push = Gate-1-green action) resolves every three-gate reference cleanly, including the wiki-lint §10/§12 references, because §4 line 109 already makes the push an implicit consequence of Gate 1 going green.

- **Question (RESOLVED — Q5):** Which gate-numbering model wins repo-wide — protocol §4's four-gate model (Brief / Sprint-Ready / Execution / Close) or the CLAUDE.md + §9 three-gate model (Initiative / Ambiguity / Push)?
- **Recommended (epic default):** the three-gate model; renumber §4 to match.
- **Human decision:** **FOUR-GATE MODEL is canonical.** Adopt protocol §4 (Brief / Sprint-Ready / Execution / Close) as the numbered spine and re-map the CLAUDE.md + §9 three-gate references (Initiative / Ambiguity / Push) *onto* it — not the reverse. Surface any unclean mapping here (none found).

- **Question (NEW — orphan test disposition):** Re-home or delete `close_sprint.deferred-verify.red.node.test.ts`?
- **Recommended:** **Delete** all three copies. The RED test's four failure premises (no Step 2.9, no `CLEARGATE_FORCE_DEFERRED_VERIFY` seam, no PASS-PENDING-SMOKE, no `deferred_verification` field) are now all false — CR-082 shipped — so as written it asserts against a live feature while being globbed by no runner; a `.node.test.ts` also must not ship in the npm payload. Re-homing it into `cleargate-cli/test/` would require rewriting its `CLOSE_SPRINT` / `REPO_ROOT` relative anchors across the meta-repo↔cli-repo boundary and would still exercise only the shipped-payload `close_sprint.mjs` copy — higher cost, lower value than deletion; CR-082's own close acceptance already covered Step 2.9. Scope below commits to delete; a re-home flip is a one-line change if the human prefers it.

### 1.5 Risks
- **Risk:** Shared-file collision with STORY-051-05 on `cleargate-protocol.md` and with STORY-051-05/07 on `CLAUDE.md` — both stories edit the same files (051-05 removes v1/v2 vocab; 051-09 re-maps gate numbers). **Mitigation:** `parallel_eligible=n`; land 051-09 **after** 051-05 and rebase; the two touch mostly disjoint lines (051-05 = vocab strings in §4/§12.4 + the CLAUDE.md "in v2" clauses; 051-09 = the gate-number tokens in §9/§10/§12 + the "Gate 1/Gate 2" halt sentence), so a rebase is mechanical.
- **Risk:** The gate re-map is a *semantic* reconciliation, not a pure find-replace; a reference could resist clean mapping and produce a residual sub-decision. **Mitigation:** the drafting audit already walked all seven protocol references + both CLAUDE.md lines and confirmed a clean map (§1.4); any reference discovered unclean at execution time is escalated as a §22 spec-contradiction blocker, not guessed.
- **Risk:** Wrong reconciliation *direction* on `launch_wave.mjs` — "fixing the header" could be read as softening the CR-074-settled §23 claim. **Mitigation:** §3.2 pins the direction (header stays; stale sprint-relative function comments move) and forbids executable-line changes; a `git diff` that touches any non-comment line fails the DoD.
- **Risk:** Deleting the orphan test loses the only behavioral test of Step 2.9. **Mitigation:** accepted — Step 2.9 was acceptance-verified at CR-082 close; the deletion is scoped to a stale TDD artifact, not live coverage, and re-home remains the human's one-line alternative (§1.4).
- **Risk:** Dogfood drift — canonical edited, live-root or payload forgotten (the recurring CR-074-class failure). **Mitigation:** §3.1 enumerates all three tiers per file; DoD requires byte-identical canonical/live/payload + `npm run prebuild` before merge.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: Doc contradiction, gate-numbering canon, and phantom-reference cleanup

  Scenario: Four-gate spine is the single numbering model repo-wide
    Given cleargate-protocol.md §4 defines the four gates (Brief / Sprint-Ready / Execution / Close)
    And §4's structure is unchanged
    When I grep both CLAUDE.md files and protocol §9/§10/§12 for the three-gate tokens
      "Gate 1 (Initiative approval)", "Gate 2 (Ambiguity", and "Gate 3 (Push)"
    Then zero occurrences remain
    And every former reference now resolves to a §4 gate
      (Initiative approval = intake before Gate 1; Ambiguity resolution = Gate 1; Push = the Gate-1-green action)

  Scenario: Stale §9 flow and phantom paths/file are corrected
    Given protocol §9 mandated an approved Initiative for all work and cited ".cleargate/plans/" in §6 and §8
    And mid-sprint-triage-rubric.md cited the deleted cleargate-cli/src/lib/triage-classifier.ts
    When I read the updated files
    Then §9 no longer requires an Initiative for non-multi-Epic work and halts work items at Gate 1 (Brief)
    And both ".cleargate/plans/" references read ".cleargate/delivery/pending-sync/"
    And no "triage-classifier.ts" reference remains in mid-sprint-triage-rubric.md

  Scenario: Every Bug.md Brief anchor points at a real heading
    Given the Bug.md <instructions> POST-WRITE BRIEF anchor list
    When I resolve each anchor against the headings in the Bug.md body
    Then every anchor cites a heading present verbatim
    And neither "§0.5" nor "§2 Impact" appears in the anchor list

  Scenario: launch_wave comments agree and the autonomy hook attributes the real agent
    Given launch_wave.mjs whose header called the launcher the execution path while function comments called it "not exercised this sprint"
    And pre-tool-use-autonomy.sh line 53 read '.agent // "unknown"'
    When I read the reconciled launch_wave comments
    And I run the autonomy hook during an active sprint against a dispatch fixture whose agent_type is "developer"
    Then the header and function comments no longer contradict, with no executable line changed
    And the hook logs the agent column as "developer", not "unknown"

  Scenario: Orphan test removed and all tiers stay in sync
    Given close_sprint.deferred-verify.red.node.test.ts exists in the canonical, live-root, and payload scaffold directories
    When the story completes
    Then the file is absent from all three directories
    And every other touched file is byte-identical across canonical, live-root, and payload
    And the story introduces no new execution_mode/v1/v2/CLEARGATE_EXEC_MODE token
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -rn "Gate 1 (Initiative approval)\|Gate 2 (Ambiguity\|Gate 3 (Push)" CLAUDE.md cleargate-planning/CLAUDE.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → 0 hits.
- [ ] `grep -n "\.cleargate/plans" cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → 0 hits.
- [ ] `grep -n "triage-classifier" cleargate-planning/.cleargate/knowledge/mid-sprint-triage-rubric.md` → 0 hits.
- [ ] Read Bug.md `<instructions>`; confirm each Brief anchor heading appears verbatim in the body (no `§0.5`, no `§2 Impact`).
- [ ] Read `launch_wave.mjs` header + `launchWave` doc comment — consistent; `git diff launch_wave.mjs` shows only comment-line changes.
- [ ] Build a tmp fixture (`.active` + `state.json` sprint_status=Active + `.dispatch-*.json` with `agent_type:"developer"`); run `pre-tool-use-autonomy.sh` with an `AskUserQuestion` payload; confirm the log's agent column is `developer`.
- [ ] `ls` all three scaffold dirs → orphan test absent; `diff` canonical/live-root/payload for each touched file → identical.
- [ ] In the cli repo: `npm run prebuild` regenerates the payload clean; `npm run typecheck` + `npm test` green.

## 3. The Implementation Guide

### 3.1 Context & Files
> Sync tiers: **canonical** = `cleargate-planning/**` (source of truth, tracked in outer repo) · **live-root** = `.cleargate/**` and root `CLAUDE.md` (tracked in outer repo — staged in the commit) · **payload** = `cleargate-cli/templates/cleargate-planning/**` (the cli repo, gitignored in outer repo; regenerated by `npm run prebuild`) · **live-.claude** = `.claude/**` (gitignored in outer repo; re-synced via `cleargate init` / hand-port, not staged).

| Item | Value |
|---|---|
| Primary File (canonical) | `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — R3/R4/R5: §9 flow, §10.2/§10.8/§10.9/§12.6 gate re-map, §6/§8 `.cleargate/plans/` fix; ⊕ **R12** §4 Gate-3 `:119` `§<N>` → `§13` (AD#4) |
| — live-root mirror | `.cleargate/knowledge/cleargate-protocol.md` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` |
| ⊕ Self-amended File (canonical) | `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — **R13** §6.2 `:294-295` collapses "Under v2 / Under v1" into one always-enforced bullet; **R14** §12 heading `:448` + §12.1 `:452` "Gate 3.5 / Gate-3-class" → Gate-4 framing; plus the orchestrator-approved `:20` §-index row retitle (3rd column only) and the `:461` "Gate-3 breach" → "Gate-4 breach" reword. Added to this table per M2.md AD#2 (2026-07-27 orchestrator ruling) — see justification note below. |
| — live-root mirror | `.cleargate/knowledge/cleargate-enforcement.md` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` |
| Related File (canonical) | `cleargate-planning/.cleargate/knowledge/mid-sprint-triage-rubric.md` — R6: strike `triage-classifier.ts` (lines 13, 155) |
| — live-root mirror | `.cleargate/knowledge/mid-sprint-triage-rubric.md` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/mid-sprint-triage-rubric.md` |
| Related File (canonical) | `cleargate-planning/.cleargate/templates/Bug.md` — R7: Brief anchors (lines 18-19 of `<instructions>`) |
| — live-root mirror | `.cleargate/templates/Bug.md` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/Bug.md` |
| Related File (canonical) | `cleargate-planning/.cleargate/scripts/launch_wave.mjs` — R8: reconcile header (11, 313) vs function comments (227, 250, 276, 307-308); comments only |
| — live-root mirror | `.cleargate/scripts/launch_wave.mjs` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/launch_wave.mjs` |
| Related File (canonical) | `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` — R10: line 53 `.agent` → `.agent_type` |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` |
| — live-.claude mirror | `.claude/hooks/pre-tool-use-autonomy.sh` (gitignored; re-sync only, not staged) |
| Related File (root, live) | `CLAUDE.md` — R2: gate-halt sentence (line 150) |
| Related File (canonical) | `cleargate-planning/CLAUDE.md` — R2: gate-halt sentence (line 28) |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/CLAUDE.md` |
| Delete File (canonical) | `cleargate-planning/.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` — R9: DELETE |
| — live-root mirror | `.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` — DELETE |
| — payload mirror | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts` — DELETE |
| New File (cli repo) | `cleargate-cli/test/scaffold/enforcement-doc-coherence.node.test.ts` — node:test asserting gate-token absence, phantom-path/file absence, Bug-anchor resolution, orphan absence + mirror parity, and the autonomy-hook `agent_type` attribution, all against the payload scaffold copies (self-contained in the cli repo) |
| Read-only (grounding) | `cleargate-planning/.cleargate/scripts/close_sprint.mjs:712-719` (Step 2.9 proves the orphan is stale); `cleargate-planning/.claude/hooks/token-ledger.sh:191` (`.agent_type` reference read); `cleargate-planning/.cleargate/scripts/write_dispatch.sh:20` (dispatch writes `agent_type`) |

> **§3.1 self-amendment justification (file-surface contract §9).** `cleargate-enforcement.md` (canonical + live-root) and the protocol `:119` `§<N>` → `§13` fix were not in this story's original file list at draft time; both are added here per the M2.md milestone plan's 2026-07-27 orchestrator ruling on Open Decision AD#2/AD#4. AD#2 assigns the enforcement §6.2 `:294-295` "Under v1/v2" bullets and the §12 heading/§12.1 "Gate 3.5 / Gate-3-class" naming to this story (both are literal four-gate-spine violations this story's R1 claims repo-wide coverage over, and 09 is already in the file editing adjacent regions); the two orchestrator-approved scope additions (the `:20` §-index row 3rd-column retitle and the `:461` "Gate-3 breach" reword) travel with the same §12 region. AD#4 assigns the protocol §4 Gate-3 `:119` `§<N>` placeholder resolution (→ `cleargate-enforcement.md` §13) to this story as the same defect class as R5's phantom paths. Both rulings are recorded verbatim in `.cleargate/sprint-runs/SPRINT-38/plans/M2.md` § "Mid-Sprint Amendment (orchestrator, 2026-07-27)". Scope stayed within the four line regions AD#2 named (`:294-295`, `:448`, `:452`, plus the two approved additions) — the five carry-over `v1`/`v2` mentions and every `(source: protocol §NN)` annotation were left untouched per the plan's carry-over CR note.

### 3.2 Technical Logic

**R2 / R3 / R4 — gate re-map (adopt §4 four-gate spine).** §4 is untouched; it is the canon. The re-map obeys one map: *Initiative approval → intake step before Gate 1; Ambiguity resolution → Gate 1 (Brief); Push → the action fired when Gate 1 goes green (not a numbered gate); Sprint-Ready/Execution/Close stay Gate 2/3/4.* Concretely:
- Root `CLAUDE.md:150` and canonical `cleargate-planning/CLAUDE.md:28`: replace "You halt at Gate 1 (Initiative approval) and Gate 2 (Ambiguity resolution) and wait for explicit human sign-off." with a sentence that halts at **Gate 1 (the per-work-item Brief, where ambiguity resolves to 🟢)** and notes that Initiative approval — when an Initiative exists — is the intake step *before* Gate 1. Do not introduce the token "Gate 2 (Ambiguity)".
- Protocol §9 (Quick Decision Reference ASCII flow, ~lines 202-210): remove the "Does an approved: true Initiative exist? ── NO → Draft Initiative → HALT at Gate 1 / YES → … HALT at Gate 2" branch. Replace with the CR-025 flow: classify → draft the work item directly into its template (Initiative optional, multi-Epic only, per §3) → present Brief → **HALT at Gate 1 (Brief)** → human resolves open questions + sets 🟢 → Gate-1-green push (`cleargate_push_item`) → archive.
- Protocol §10.2 (line 254): "halts Gate 1 (Initiative approval) and Gate 3 (Push)" → "halts at Gate 1 (Brief) — where the Gate-1-green push (`cleargate_push_item`) also fires".
- Protocol §10.8 (lines 348-349): "Gate 1 (Initiative approval): lint must pass before the agent may proceed past the Initiative halt." → "Gate 1 (Brief): lint must pass before the agent proceeds past the Brief halt." "Gate 3 (Push): lint must pass before `cleargate_push_item` is called." → "The Gate-1-green push: lint must pass before `cleargate_push_item` is called."
- Protocol §10.9 (line 369): "at Gate 1 or Gate 3" → "at Gate 1 (Brief) or the Gate-1-green push".
- Protocol §12.6 (line 512): "§4 Phase Gates: 'Gate 2 (Ambiguity) is machine-checked via `cleargate gate check`; see §12.'" → "§4 Phase Gates: 'Gate 1 (Brief) is machine-checked via `cleargate gate check`; see §12.'"

**R5 — plans path.** Protocol §6 (line 161) and §8 (line 183): `.cleargate/plans/` → `.cleargate/delivery/pending-sync/` (matches §4 line 111 + CLAUDE.md Initiative Intake, which write `pending-sync/INITIATIVE-NNN_*.md`).

**R6 — phantom module.** `mid-sprint-triage-rubric.md:13` ("**Classifier aid:** `cleargate-cli/src/lib/triage-classifier.ts` exports a `classify()` pure function …") → rewrite the "Classifier aid" line to describe classification as a rubric/heuristic step keyed off this doc's four class definitions and the protocol §2 Classification Table (no module). `:155` (the Cross-References bullet "**`cleargate-cli/src/lib/triage-classifier.ts`** — keyword-heuristic classifier") → strike the bullet (or replace with a pointer to protocol §2). Match the wording already landed in SKILL.md §C.10 by STORY-043-09.

**R7 — Bug.md Brief anchors.** In the `<instructions>` POST-WRITE BRIEF list (lines ~16-20), the three broken anchors resolve to real Bug.md headings: `Open Questions ← §0.5 Open Questions` → `Open Questions ← ### Open Questions`; `Edge Cases ← §2 Impact (edge conditions)` → `Edge Cases ← §2 Reproduction Protocol (edge conditions)`; `Risks ← §2 Impact` → `Risks ← §4 Execution Sandbox (suspected blast radius)`. (These are the sections that actually carry those Brief facets in the Bug.md body.)

**R8 — launch_wave comment reconciliation.** Keep the header (line 11) and direct-run banner (line 313) — they state the CR-074-settled protocol-§23 contract ("This launcher IS the execution path"). Rewrite the stale sprint-relative *function* comments to agree: line 227 "next-sprint surface; not exercised this sprint" → "the live wave-execution path (protocol §23)"; line 250 "(SPRINT-32 runs serial — no real dispatch)" → frame the injected `parallel`/`segmentRunner` seams as a *testability* affordance, dropping the sprint-relative "no real dispatch"; line 276 "the SPRINT-32 serial-build case" → "the seam-not-supplied / plan-only case"; lines 307-308 "there is no live wave to drive in this sprint, so direct execution is informational only." → "direct execution prints a usage note; live waves run via the Workflow tool (`/workflows`)." **No non-comment line is modified** — the `if (typeof parallel !== 'function' …)` plan-only branch and all logic stay byte-identical.

**R9 — orphan delete.** `git rm` the three copies of `close_sprint.deferred-verify.red.node.test.ts` (canonical, live-root, payload). Rationale in-commit: stale CR-082 RED artifact (feature shipped at `close_sprint.mjs:712-719`), globbed by no runner, and a `.node.test.ts` must not ship in the payload.

**R10 — autonomy hook key.** `pre-tool-use-autonomy.sh:53`: `xargs -I {} jq -r '.agent // "unknown"' {}` → `xargs -I {} jq -r '.agent_type // "unknown"' {}`. Exit code stays 0 always (soft mode). This is the sole executable change in the story.

**R11 — sync + regression.** After each canonical edit: copy to live-root, run `npm run prebuild` in the cli repo to regenerate the payload, and hand-sync the gitignored `.claude/hooks/pre-tool-use-autonomy.sh` live copy. Grep-assert no new `execution_mode|v1|v2|CLEARGATE_EXEC_MODE` token was introduced by any edit in this story.

### 3.3 API Contract (if applicable)
N/A — no API surface. The only behavioral change (R10) alters the hook's tab-separated log column from a constant `"unknown"` to the dispatch's `agent_type`; exit code remains 0 in all paths.

## 4. Quality Gates

### 4.1 Minimum Test Expectations
| Test Type | Minimum Count | Notes |
|---|---|---|
| Hook behavior (node:test) | 1 | Spawn the payload `pre-tool-use-autonomy.sh` with a tmp `.active`+`state.json`(Active)+`.dispatch-*.json`(`agent_type:"developer"`) fixture and an `AskUserQuestion` payload; assert the appended log's agent column equals `developer` (regression guard for `.agent`→`.agent_type`). Real shell, no mocks. |
| Doc-coherence assertions (node:test) | 1 | fs/grep predicates over the payload scaffold copies: zero three-gate tokens in both CLAUDE.md + protocol; zero `.cleargate/plans/` in protocol; zero `triage-classifier.ts` in the rubric; every Bug.md Brief anchor matches a body heading; launch_wave has no non-comment diff vs the reconciled baseline. |
| Mirror-parity + orphan-absence (node:test) | 1 | Assert `fs.existsSync` is false for the orphan test in all three scaffold dirs, and canonical/live-root/payload are byte-identical for every touched file. |

### 4.2 Definition of Done (The Gate)
- [ ] R1-R11 implemented; §2.1 Gherkin scenarios all satisfied.
- [ ] 3 node:test files/scenarios above pass (`tsx --test`, `*.node.test.ts`); no vitest.
- [ ] `grep -rn "Gate 1 (Initiative approval)\|Gate 2 (Ambiguity\|Gate 3 (Push)"` over both CLAUDE.md + protocol → 0.
- [ ] `grep -n "\.cleargate/plans"` protocol → 0; `grep -n "triage-classifier"` rubric → 0.
- [ ] Bug.md Brief anchors each match a verbatim body heading; no `§0.5` / `§2 Impact` remain.
- [ ] `git diff` on `launch_wave.mjs` touches comment lines only (no executable-line change).
- [ ] Orphan test absent from canonical, live-root, and payload.
- [ ] Canonical → live-root synced; `npm run prebuild` regenerated the payload; gitignored `.claude/hooks` live copy hand-synced; canonical/live/payload byte-identical for every touched file.
- [ ] No new `execution_mode`/`v1`/`v2`/`CLEARGATE_EXEC_MODE` token introduced (grep gate clean).
- [ ] Landed after STORY-051-05 and rebased (shared-file coordination).

## Existing Surfaces
> L1 reuse audit.

- **Surface:** `cleargate-planning/.claude/hooks/token-ledger.sh:191` — reads `jq -r '.agent_type // empty'` from the same `.dispatch-*.json`. This is the exact correct-key pattern the autonomy-hook fix (R10) copies.
- **Coverage of this requirement (R10):** ≥80% — the fix is a one-token change to match this already-correct sibling read; no new logic.
- **Surface:** `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md:98-128` — §4 "The Four Gates" already defines the canonical spine (Gate 1 Brief incl. line 109 "the same approval implicitly grants the MCP push"; Gate 2 Sprint-Ready; Gate 3 Execution; Gate 4 Close-Ack).
- **Coverage of this requirement (R1-R4):** partial — §4 is the target of the re-map, already correct; the work is editing the *other* references (§9/§10/§12, both CLAUDE.md) to agree with it, which is net-edit not reuse.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs:712-719` — Step 2.9 Deferred-Verification Close Gate (CR-082), live. Its existence proves the orphan RED test (R9) is stale.
- **Coverage of this requirement (R9):** none — the finding is that a stale artifact must be *removed*; there is nothing to reuse.
- **Surface:** SKILL.md §C.10 (STORY-043-09, SPRINT-33) — already rewrote its `triage-classifier.ts` reference to point at `mid-sprint-triage-rubric.md`.
- **Coverage of this requirement (R6):** partial — provides the wording precedent the rubric-doc edit mirrors; the rubric doc itself was missed by that sweep and is what this story fixes.

## Why not simpler?
- **Smallest existing surface that could carry this:** none single — the work is a coherence sweep across six doc/script surfaces + two `CLAUDE.md` files + one 3-copy deletion; there is no one file or config flag that carries it.
- **Why isn't extension / parameterization / config sufficient?** These are stale *strings*, phantom *paths*, dead *file references*, and a self-contradicting *comment* — defects in prose and comments, not values a parameter can toggle. But they are not independent one-liners either: the gate re-mapping is a single semantic reconciliation that must land atomically (a half-renumbered protocol is *more* confusing than the current state), and all the fixes share one theme (P2 doc-contradiction + phantom-reference cleanup) and mostly one file (`cleargate-protocol.md`). Splitting into eight micro-CRs would over-fragment a cohesive coherence pass and multiply the dogfood-sync tax (canonical/live/payload) eightfold; folding it into the vocabulary sweep (051-05) would join two unrelated goals (numbering-canon vs vocab-purge) and trip the Granularity Rubric the other way. One L3 story is the right size.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2. (R1-R4 → Scenario 1; R3/R5/R6 → Scenario 2; R7 → Scenario 3; R8/R10 → Scenario 4; R9/R11 → Scenario 5.)
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding. (Every path Read/Grepped this session; line numbers confirmed current.)
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

*(The remaining gap to 🟢 is the epic-level `approved: true`, which is not this story's to set.)*