---
bug_id: BUG-071
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: "{name}"
approved: true
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
  last_gate_check: 2026-09-01T23:13:42Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: gate-predicates
---

# BUG-071: The epic and story templates instruct a sentinel the readiness predicate rejects

> **First-user field report,** 2026-09-02. Found by running ClearGate's full
> lifecycle from a `npm pack` tarball in a fresh consumer repo. **Fixed in the
> same run** — recorded here for the trail.

### Open Questions

- **Question:** Widen the predicate's sentinel list, or change the templates to name an accepted phrase?
- **Recommended:** **Widen the predicate.** "none — net-new" is the more natural thing to write, it already appears in two shipped templates, and any user text that means "there is nothing here" should pass. Changing the templates would leave every already-authored item still failing.
- **Human decision:** Accepted as recommended — `net-new` added to the alternation.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** an author fills `## Existing Surfaces` exactly as the
template's own Ambiguity Gate instructs and the readiness gate passes.

**Actual Behavior:** the gate fails. `templates/epic.md` and `templates/story.md`
both carry the checkbox:

> `- [ ] Existing Surfaces cites at least one source-tree path or explicitly
>       states "none — net-new."`

but `existing-surfaces-verified` accepted only four phrases, none of them that one.

## 2. Reproduction Protocol

1. `cleargate init` in a fresh repo; `cleargate new epic "anything"`.
2. Fill `## Existing Surfaces` with `none — net-new` — the literal phrase the
   document's own gate checklist names.
3. `cleargate gate check .cleargate/delivery/pending-sync/EPIC-001_*.md`
4. Observe: `existing-surfaces-verified: '## Existing Surfaces' has no path
   citations and no "no overlap found" sentinel`.

## 3. Evidence & Context

`cleargate-cli/src/lib/readiness-predicates.ts:953` before the fix:

```ts
const SENTINEL_RE =
  /no overlap found|no existing surface|no prior implementation|audit returned empty/i;
```

The template body and the enforcing predicate disagreed about the accepted
vocabulary, and the template is the half the user reads. A greenfield project —
the exact case the "net-new" wording exists to serve — could not pass
`epic.ready-for-decomposition` by following its own instructions.

Blast radius confirmed: the phrase appears in BOTH `templates/epic.md` and
`templates/story.md`, and `existing-surfaces-verified` is wired into three gates
(`readiness-gates.md:131`, `:179`, `:208`).

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — the sentinel alternation

## Task Breakdown

- [x] Add `net-new` to the sentinel alternation
- [x] Verify a greenfield epic and story now pass
- [ ] Consider whether the four original sentinels should be documented in the templates too

## 5. Verification Protocol (The Failing Test)

**Command:** `npx tsx --test test/lib/readiness-predicates.node.test.ts`

Red test: an `## Existing Surfaces` section whose only content is
`none — net-new` must pass `existing-surfaces-verified`. Before the fix it failed.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | the `net-new` sentinel passes the predicate |
| Integration tests | 0 | predicate is pure over a document body; no collaborators |
| E2E / acceptance tests | 0 | covered by the unit case |

---

## Prior work

- [[CR-033]] — introduced `existing-surfaces-verified` and its sentinel list.
- [[BUG-062]] — the same section parsed by a different consumer, also mismatched against what authors actually write.

## Context Source

**context_source:** verified codebase grounding — `readiness-predicates.ts:953`, both shipped templates, and a live gate failure in a fresh consumer repo, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — fixed and verified 2026-09-02**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
