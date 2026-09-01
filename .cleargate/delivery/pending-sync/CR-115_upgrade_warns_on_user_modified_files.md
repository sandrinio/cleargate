---
cr_id: CR-115
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
area: cli-upgrade
context_source: verified codebase grounding — upgrade.ts and manifest.ts read directly 2026-08-31; field report of 14 silently-overwritten files from a live consumer repo
created_at: 2026-08-31T12:23:21Z
updated_at: 2026-09-01T00:00:00Z
created_at_version: 0.25.0
updated_at_version: 0.25.0
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
  last_gate_check: 2026-08-31T12:27:45Z
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

# CR-115: `cleargate upgrade` announces what it is about to overwrite, before it overwrites it

> **Field report.** On a `0.24.2 → 0.25.0` upgrade in a live consumer repo, 70 files were planned and
> **14 carried local edits**. All 14 were replaced. The user caught it only because they ran
> `--dry-run | grep -E 'user-modified|both-changed'` first and diffed afterwards — a defence that
> exists nowhere in the documentation and that nobody will perform twice.

## 0.5 Open Questions

- **Question:** Should `upgrade` refuse to proceed when user-modified files are in the plan, or warn and continue?
- **Recommended:** **Warn prominently and continue; refuse only under `--strict`.** A hard refusal would make routine upgrades unrunnable in exactly the repos that have invested most in the scaffold. The failure here was not that the overwrite happened — it is documented policy — but that it was *unannounced at the moment of decision*.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

- **Question:** Should this CR also introduce a `.cleargate/local-overrides/` mechanism so repos can carry scaffold deltas that survive upgrade?
- **Recommended:** **No — file it separately.** It is a design problem (precedence, merge semantics, uninstall behaviour) that deserves its own item and probably its own epic. Bundling it here would trip the granularity rubric and delay a warning that is worth shipping on its own. Record it as a follow-on.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

- **Question:** Does the `ingest_buckets` gap belong in this CR?
- **Recommended:** **Yes.** It is the same defect class from the opposite direction — `upgrade` silently *not* changing config that new features require. `spikes` shipped as a wiki bucket, but an existing repo's `config.yml` is never retro-updated, so upgraded repos silently do not ingest spike charters. One line of warning output, same code path, same review.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (to be evicted):** the assumption that per-file state lines interleaved through a 70-file run constitute notice. `upgrade.ts:341` emits `[yes] taking theirs: <path>  state=<state>` once per file, inline, in file order. A `user-modified` line is typographically identical to a `clean` one and is separated from its 13 siblings by dozens of unrelated lines. Nothing aggregates them; nothing appears before the writes begin.

**New Logic:** before any file is written, `upgrade` computes the classification for the whole plan and, when any file is `user-modified` or `both-changed`, prints a grouped warning block at the top of the run naming every such file and what will happen to it. The per-file lines stay as they are. Additionally, when the upgrade introduces config keys an existing `.cleargate/config.yml` lacks — `wiki.ingest_buckets` entries such as `spikes` — it names them and states that they were not added.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update Story: none — no story depends on `upgrade`'s output format
- [ ] Invalidate/Update Epic: none
- [ ] Database schema impacts? **No** — CLI-local output change; no persisted state, no MCP surface.

Behavioural risk is low and one-directional: the command does strictly more reporting and the same writing. The only way this breaks a consumer is if something scrapes `upgrade`'s stdout, which nothing in this repo does.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/manifest.ts:268` — already classifies a file as `user-modified`, and `:277` as `both-changed`. The classification this CR surfaces **already exists and is already correct**; nothing new needs to be computed.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:341` — emits the per-file `[yes] taking theirs: <path>  state=<state>` line during a real run.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:658-684` — the `--dry-run` reporting block, which already renders `state=<pre> → <post>` and a `N files planned` summary. This is the presentation logic to lift and reuse ahead of the write phase.
- **Why this CR extends rather than rebuilds:** every input this CR needs is already computed and already rendered somewhere. `manifest.ts` produces the classification, and the `--dry-run` block already knows how to present it. The defect is purely one of *ordering and aggregation* — the information exists but arrives after the decision it should inform, and scattered rather than grouped. The change is to hoist and group existing output, not to compute anything new.

## Prior work

- [[BUG-037]] — `upgrade` blanks detected gate commands. Same command, same class: `upgrade` silently discarding local state.
- [[CR-088]] — upgrade pin and prune. Adjacent surface; touches the same plan/apply pipeline.
- [[BUG-038]] — pre-edit gate ships an unsubstituted pin, a defect introduced *by* the upgrade path.
- [[CR-105]] — safe instruction-block updates; the same "do not clobber what the user wrote" principle applied to CLAUDE.md injection.
- [[CR-099]] — dogfood split integrity; documents why canonical/payload/live divergence is load-bearing here.

## 3. Execution Sandbox

**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts` — hoist a grouped warning ahead of the write phase; reorder `--dry-run` so the file plan precedes the CHANGELOG
- `cleargate-cli/src/lib/manifest.ts` — read-only; the classification source
- `cleargate-cli/src/commands/init.ts` — the `config.yml` write path, for the missing-`ingest_buckets` notice

Do not change overwrite *policy* in this CR. Files classified `overwrite` continue to be overwritten; this item changes only what the user is told and when.

## Task Breakdown

- [ ] Compute the full plan classification before the write phase and collect `user-modified` + `both-changed` entries
- [ ] Emit a grouped warning block naming each such file and its disposition, before the first write
- [ ] Add `--strict` to abort when that set is non-empty
- [ ] Reorder `--dry-run` output so the file plan prints before the CHANGELOG
- [ ] Detect `wiki.ingest_buckets` entries present in the shipped config but absent from the repo's, and name them in the run summary
- [ ] Add tests for the warning block, `--strict` abort, and the ingest_buckets notice

## 4. Verification Protocol

**Command:** `cd cleargate-cli && npx tsx --test src/commands/upgrade.node.test.ts`

Red test (must fail before the change): build a fixture repo with two locally-edited scaffold files, run `upgrade --yes`, and assert stdout contains a grouped warning naming both files **before** the first `[yes] taking theirs:` line. Today no such block exists at any position.

Second: assert `upgrade --strict --yes` exits non-zero without writing when that set is non-empty.

Third: assert a repo whose `config.yml` omits `spikes` receives a named notice.

Fourth: assert `--dry-run` prints its first `[dry-run]` plan line before any CHANGELOG content.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | grouped warning content and position; `--strict` abort; ingest_buckets notice; dry-run ordering |
| Integration tests | 1 | full `upgrade --yes` against a fixture repo with real locally-modified files on disk, asserting both the warning and that the files were still replaced |
| E2E / acceptance tests | 0 | `upgrade` is itself the user-facing surface; the integration case exercises the real command end-to-end, so a separate acceptance layer would duplicate it |

---

## Context Source

**context_source:** verified codebase grounding — `upgrade.ts:341`, `upgrade.ts:658-684`, and `manifest.ts:268-277` read directly on 2026-08-31; field report of a `0.24.2 → 0.25.0` upgrade that replaced 14 locally-modified files in a live consumer repo.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — approved at Gate 1 (2026-09-01)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
