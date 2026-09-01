---
cr_id: CR-119
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Triaged
approved: false
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-09-01T23:14:39Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: templates
---

# CR-119: The story template's §3.1 cannot express a greenfield story

> **First-user field report,** 2026-09-02. Found while decomposing a brand-new
> project; **not yet implemented** — this is a template + parser change needing
> a decision.

## 0.5 Open Questions

- **Question:** Fix this in the template (document the working format) or in the parser (accept creates from any row)?
- **Recommended:** **Both, template first.** The template change is one line and unblocks users immediately. The parser change — treating a path as a create when the story declares it under any create-ish label — is the durable fix but touches the BUG-046 reachability classifier, which deserves its own careful pass.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (to be evicted):** that `| Primary File |` is the right row for
a story's main file. For a story that CREATES that file, it is actively wrong.

`classify_path()` (`collision_surface.sh:236-243`) exempts a path from the
UNREACHABLE annotation only when its row label is a create label
(`is_create_label`). A new file listed under `Primary File` is untracked and
carries a non-create label, so it is annotated UNREACHABLE, `architect-reader`
reports it in `unreachable_surface`, and BUG-046's generation-time gate makes
`architect-synth` refuse to co-wave the story. **Every story in a greenfield
sprint is refused; wave parallelism becomes impossible for new projects.**

**New Logic:** the template states the rule plainly — files this story CREATES go
in the `New Files Needed` row, as backticked paths only; `Primary File` and
`Related Files` are for files that already exist. The row's example becomes a
backticked path rather than `Yes/No — {Name of file}`.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — existing stories keep working
- [ ] Invalidate/Update Epic: none
- [ ] Database schema impacts? **No** — template text and parser labels only.

## Existing Surfaces

- **Surface:** `cleargate-planning/.cleargate/templates/story.md` — the §3.1 table and its guidance blockquote.
- **Surface:** `cleargate-planning/.cleargate/scripts/collision_surface.sh` — `is_create_label()` and `classify_path()`.
- **Coverage of this requirement:** partial — the mechanism exists and works; only the authoring guidance is missing.

## Prior work

- [[BUG-046]] — introduced the worktree-reachability classifier and the create-row exemption this CR documents.
- [[BUG-062]] — the same row's prose being tokenized into the file surface; directly adjacent, and the reason the "paths only" half of the rule matters.

## 3. Execution Sandbox

**Investigate / Modify:**
- `cleargate-planning/.cleargate/templates/story.md` — §3.1 guidance and example
- `cleargate-planning/.cleargate/scripts/collision_surface.sh` — optional parser half

## Task Breakdown

- [ ] Rewrite §3.1's guidance to state which row creates belong in
- [ ] Change the `New Files Needed` example to a backticked path
- [ ] Consider accepting creates declared under any row when the story is greenfield
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 4. Verification Protocol

**Command:** `bash .cleargate/scripts/test/test_collision_surface.sh`

Red test: a story whose §3.1 lists a new file under `Primary File` currently
emits an UNREACHABLE annotation for it. After the template change, a story
authored per the new guidance emits zero UNREACHABLE annotations and a clean
surface. Verified by hand in this run: moving four stories' creates into the
`New Files Needed` row took them from fully-unreachable to zero annotations.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | create under `New Files Needed` is exempt; create under `Primary File` is annotated |
| Integration tests | 1 | a greenfield two-story wave is co-waved rather than refused |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Context Source

**context_source:** verified codebase grounding — `collision_surface.sh:215-244`, `templates/story.md` §3.1, and a live greenfield sprint where all four stories were initially fully unreachable, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — awaiting the human decision in Open Questions**

Requirements to pass to Green:
- [x] Old vs New logic is explicitly contrasted.
- [x] Blast radius is enumerated.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
