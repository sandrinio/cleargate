---
cr_id: CR-117
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
area: cli-diagnostics
context_source: verified codebase grounding — validate_state.mjs argument handling read directly 2026-08-31; field report from a live sprint
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

# CR-117: A CLI script that ignores an argument says so

> **Field report.** Small, but it cost real time during a live sprint: the operator passed a path,
> the tool ignored it, and then complained that it could not decide which file to use — while
> listing fifteen candidates, one of which was the path just given.

## 0.5 Open Questions

- **Question:** Accept the positional path, or reject it with a message?
- **Recommended:** **Accept it.** `validate_state.mjs <path>` is the obvious calling convention and every other script in `.cleargate/scripts/` that takes a file takes it positionally. Treat a lone positional as `--state-file`. Reject only when *both* a positional and `--state-file` are given, and say which one wins.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

- **Question:** Is one CR the right container for unrelated small fixes?
- **Recommended:** These are one thing, not several: each is a CLI surface that silently discards operator input and then reports a problem caused by the discard. If review disagrees, the `validate_state` fix is the one worth keeping and the rest can be dropped without loss.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (to be evicted):** argument parsing that scans for a named flag and drops everything else on the floor. `validate_state.mjs:186-187` reads `process.argv.slice(2)` and then looks only for the index of `--state-file`. A positional path is neither consumed nor reported — it simply does not exist as far as the script is concerned. The script then falls through to auto-discovery, finds many candidates, and exits with `Multiple state.json files found; specify --state-file:` followed by a list of fifteen paths (`validate_state.mjs:214`). The operator has already specified one.

**New Logic:** a lone positional argument is treated as the state file. When a positional and `--state-file` are both present, the script names both and states which it used. An argument the script does not understand is named in the error rather than silently discarded.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update Story: none
- [ ] Invalidate/Update Epic: none
- [ ] Database schema impacts? **No** — argument parsing only; no persisted state.

Strictly additive: input that works today keeps working, and input that is silently ignored today starts working.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `.cleargate/scripts/validate_state.mjs:186` — `const args = process.argv.slice(2);` then `args.indexOf('--state-file')` at `:187`. The positional is never read.
- **Surface:** `.cleargate/scripts/validate_state.mjs:214` — the `Multiple state.json files found; specify --state-file:` error that fires *because* the supplied path was discarded.
- **Surface:** `.cleargate/scripts/validate_state.mjs:5` — the usage string `Usage: node validate_state.mjs [--state-file <path>]`, which must be updated to document the positional form.
- **Why this CR extends rather than rebuilds:** the script's discovery, validation, and reporting logic are all correct and stay untouched. The only change is at the argument boundary — read a value that is already being passed in and already has a well-defined destination.

## Prior work

- [[BUG-039]] — `state update` never resolves the state file. Same script family, same class of defect: state-file resolution failing to honour what the caller supplied.
- [[BUG-052]] — surface gate resolves the wrong story; another resolution-layer defect where the tool picks a target the operator did not intend.
- [[CR-093]] — file argument owns project root. Directly adjacent: establishes the precedent that a supplied file argument is authoritative for resolution rather than advisory.

## 3. Execution Sandbox

**Investigate / Modify:**
- `.cleargate/scripts/validate_state.mjs` — argument parsing at `:186-187`, usage string at `:5`, error path at `:214`

Do not change discovery or validation semantics. Scope is the argument boundary only.

## Task Breakdown

- [ ] Treat a lone positional argument as `--state-file` in `validate_state.mjs`
- [ ] When both a positional and `--state-file` are supplied, name both and state which was used
- [ ] Update the usage string to document the positional form
- [ ] Add tests for positional, flag, both-supplied, and unrecognised-argument cases

## 4. Verification Protocol

**Command:** `node .cleargate/scripts/validate_state.mjs .cleargate/sprint-runs/<sprint>/state.json`

Red test (must fail before the change): in a repo containing more than one `state.json`, invoke the script with a valid positional path. Assert exit code 0 and that the named file was validated. Today it exits non-zero with `Multiple state.json files found`.

Second: assert that supplying both a positional and `--state-file` names both in the output.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | positional accepted; flag accepted; both-supplied names both; unrecognised argument named in the error |
| Integration tests | 0 | the script's own invocation *is* the unit under test — it is a standalone CLI entrypoint with no collaborators to integrate against, so an integration layer would re-run the unit cases verbatim |
| E2E / acceptance tests | 0 | internal maintenance script, not part of any user-facing acceptance flow |

---

## Context Source

**context_source:** verified codebase grounding — `validate_state.mjs:5`, `:186-187`, `:214` read directly on 2026-08-31; field report from the `doc_processor` SPRINT-15 orchestrator.

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
