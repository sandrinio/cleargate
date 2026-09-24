---
story_id: STORY-058-01
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
ambiguity: 🟢 Low
context_source: Decomposition of [[EPIC-058]] on direct owner instruction 2026-09-04. Grounded in verified cleargate-cli source paths and Codex CLI v0.153.2 documented contracts; no path in this story is inferred.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-04T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:25:01Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T23:05:26Z
  sessions: []
---

# STORY-058-01: Tracked scaffold/core + scaffold/hosts/claude payload layout

**Milestone:** M1 — Foundation

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want the distributable scaffold to live in tracked paths inside `cleargate-cli`, so that the npm package can be built from its own checkout without reaching into a sibling meta-repo directory.

### 1.2 Detailed Requirements
- Create `cleargate-cli/scaffold/core/**` holding every harness-neutral asset: the whole `.cleargate/**` tree (templates, knowledge, scripts, delivery skeleton, config).
- Create `cleargate-cli/scaffold/hosts/claude/**` holding the Claude-only assets relocated verbatim: `.claude/agents/**` (11 files), `.claude/skills/**` (3 skills), `.claude/hooks/**` (9 hooks), `.claude/settings.json`, and the `CLAUDE.md` bounded-block source.
- The relocation is byte-preserving. Every file's content, mode bit, and the `__CLEARGATE_VERSION__` pin placeholder survive unchanged.
- `cleargate-cli/scripts/copy-planning-payload.mjs` reads from the new tracked layout instead of `../cleargate-planning`.
- The generated npm payload under `cleargate-cli/templates/cleargate-planning/**` remains byte-identical to what it produces today, so a target repo installed from the new layout is indistinguishable from one installed from the old.

### 1.3 Out of Scope
- Any change to `cleargate init`'s installed output. This story moves sources only.
- Creating `scaffold/hosts/codex/**` or `scaffold/hosts/copilot/**` — later stories.
- Deleting `cleargate-planning/` from the meta-repo. That is [[STORY-058-02]]'s call once nothing reads it.

### 1.4 Open Questions
- **Question:** does `cleargate-planning/` remain in the meta-repo as a deprecated mirror during the transition, or is it deleted the moment nothing reads it?
- **Recommended:** keep it for the duration of SPRINT-41 with a `DEPRECATED.md` marker, delete at sprint close once [[STORY-058-02]] proves the pack is self-contained. Deleting it in this story would strand the live dogfood re-sync path mid-sprint.
- **Human decision:** {pending Gate 1}

### 1.5 Risks
- **Highest-blast-radius story in the sprint.** It moves every payload source at once; a silent content drift here corrupts every downstream install.
- The meta-repo's documented canonical→payload→live propagation path (CLAUDE.md, *Dogfood split*) changes. If the doc is not updated in this same story, the next maintainer re-syncs from a path that no longer exists.
- Mode bits: all 9 hooks are `755`. A copy that drops the executable bit produces an install whose hooks silently never fire — the failure mode is invisible at `init` time.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Tracked scaffold payload layout

  Scenario: Payload generation reads only from the cleargate-cli checkout
    Given the tracked scaffold/core and scaffold/hosts/claude trees
    When `npm run prebuild` runs in cleargate-cli
    Then no file outside the cleargate-cli checkout is read
    And the generated payload tree is byte-identical to the pre-relocation output

  Scenario: Hook executable bits survive relocation
    Given the 9 hook scripts under scaffold/hosts/claude/.claude/hooks/
    When the payload is generated
    Then every hook file is mode 755

  Scenario: The version-pin placeholder survives relocation
    Given payload files containing __CLEARGATE_VERSION__
    When the payload is generated
    Then the placeholder is still present and unsubstituted in the payload
    And substitution remains the responsibility of init and upgrade

  Scenario: Relocation changes no installed output
    Given a target repo installed from the pre-relocation payload
    And a target repo installed from the post-relocation payload
    When the two installed trees are compared
    Then they are byte-identical
```

### 2.2 Verification Steps (Manual)
- [ ] Run `npm run prebuild` in `cleargate-cli/` and diff the generated payload against a pre-change copy — expect zero differences.
- [ ] `ls -l` the generated `.claude/hooks/` and confirm 9 files at `755`.
- [ ] Confirm CLAUDE.md's *Dogfood split* section names the new canonical path.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/copy-planning-payload.mjs` |
| Related Files | `CLAUDE.md`, `cleargate-planning/**` |
| New Files Needed | `cleargate-cli/scaffold/core/**`, `cleargate-cli/scaffold/hosts/claude/**` |

- `cleargate-cli/scaffold/core/**` — **create**. Harness-neutral `.cleargate/**` assets.
- `cleargate-cli/scaffold/hosts/claude/**` — **create**. Relocated Claude assets.
- `cleargate-cli/scripts/copy-planning-payload.mjs` — **modify**. Source path repoint.
- `CLAUDE.md` — **modify**. The *Dogfood split — canonical vs live* section documents `cleargate-planning/` as canonical; that becomes wrong the moment this lands.
- `cleargate-planning/**` — **read-only source** for the move; not deleted in this story.

### 3.2 Technical Logic
The move is mechanical but must be verified mechanically, not by eye. Generate the payload before the change, snapshot it, perform the relocation, regenerate, and diff. The diff being empty is the story's real acceptance test — every Gherkin scenario above is a facet of it.

Preserve `copy-payload.ts`'s existing policy constants untouched: `SKIP_FILES` (`CLAUDE.md`, `MANIFEST.json`), `FIRST_INSTALL_ONLY` (`.gitignore`, `.cleargate/FLASHCARD.md`, `.cleargate/scripts/`), and `PIN_PLACEHOLDER`. This story changes where sources are read from, never what the copier does with them.

### 3.3 API Contract (if applicable)
Not applicable — no external interface changes.

## Task Breakdown

- [ ] Snapshot the current generated payload tree as the byte-comparison baseline.
- [ ] Create `scaffold/core/**` from the harness-neutral `.cleargate/**` assets.
- [ ] Create `scaffold/hosts/claude/**` from the `.claude/**` assets plus the CLAUDE.md block source.
- [ ] Repoint `copy-planning-payload.mjs` at the tracked layout.
- [ ] Regenerate and diff against the baseline; resolve to zero differences.
- [ ] Assert hook mode bits and pin-placeholder survival.
- [ ] Update CLAUDE.md's *Dogfood split* section to name the new canonical path.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Payload source resolution; pin-placeholder passthrough |
| Integration tests | 2 | Byte-identical payload generation; hook mode-bit preservation |
| E2E / acceptance tests | 1 | Install from the regenerated payload matches the pre-relocation install |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] CLAUDE.md *Dogfood split* section updated in this same story, not deferred.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — the `prebuild` payload generator that currently reads `../cleargate-planning`.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:54` — `SKIP_FILES`; `:~80` `FIRST_INSTALL_ONLY`; `PIN_PLACEHOLDER`. Policy this story must not disturb.
- **Surface:** `cleargate-planning/.claude/settings.json` — the hook-config asset being relocated, alongside the 11 agents, 3 skills and 9 hooks in sibling directories.
- **Surface:** `cleargate-planning/MANIFEST.json` — payload integrity artifact carrying `path`/`sha256`/`tier`/`overwrite_policy`/`preserve_on_uninstall` per file.

## Why not simpler?

- **Smallest existing surface:** `copy-planning-payload.mjs` alone — repoint it at a path inside the checkout.
- **Why isn't that sufficient?** It is, for this story alone, and that is exactly why this story is scoped to the move and nothing else. The `core` / `hosts/<name>` split is not decoration: [[STORY-058-03]] onward needs a per-host source root to copy subsets from, and retrofitting that split after adapters exist would mean moving the files twice.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)

