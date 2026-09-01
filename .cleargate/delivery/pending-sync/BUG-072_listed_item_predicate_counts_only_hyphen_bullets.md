---
bug_id: BUG-072
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Triaged
severity: P2-Medium
reporter: "{name}"
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

# BUG-072: `listed-item` counts only `- ` bullets, so an ordered list scores zero

> **First-user field report,** 2026-09-02. **NOT fixed** — the one-line fix is
> blocked by a deliberate content-hash freeze. Needs a human decision.

### Open Questions

- **Question:** Lift the T9 freeze on `evalSection` so the regex can be widened in place, or leave `listed-item` hyphen-only and change the templates to stop inviting ordered lists?
- **Recommended:** **Lift the freeze and widen the regex.** The freeze protected a specific past sprint's refactor; that sprint has closed. Ordered lists are correct CommonMark and the initiative template explicitly asks for a "step-by-step" walkthrough, which is what an ordered list is for.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** a section populated with a markdown list satisfies a
`section(N) has ≥1 listed-item` criterion, whichever CommonMark list marker the
author used.

**Actual Behavior:** only `- ` counts. An ordered list (`1.` / `1)`) and `*` /
`+` bullets all score zero, and the failure reads as though the section were
empty.

## 2. Reproduction Protocol

1. `cleargate new initiative "anything"` in a fresh repo.
2. Write §1 User Flow as a numbered list — the form the template's own guidance
   ("step-by-step") invites.
3. Trigger a gate check (the stamp hook does it on write).
4. Observe in the frontmatter:
   `failing_criteria: [{id: user-flow-populated, detail: "section 1 has 0 listed-item (≥1 required)"}]`

## 3. Evidence & Context

`cleargate-cli/src/lib/readiness-predicates.ts:683-685`:

```ts
case 'listed-item':
  actualCount = (sectionContent.match(/^\s*- /gm) || []).length;
```

Three valid CommonMark list syntaxes score zero. The message "has 0 listed-item"
reads as "you wrote nothing" rather than "wrong bullet character", which is what
makes it cost real time.

**Why this is not yet fixed.** The widening is one regex, but it lives inside
`evalSection`, which is content-hash pinned:

```
✖ evalSection body is byte-identical to the frozen baseline
AssertionError: evalSection changed — N5/Cross-Cutting Rule 3 forbids
modifying it; add a sibling function instead
```

The `listed-item` branch is inside that function's switch, so it cannot be moved
to a sibling without restructuring the frozen function. The edit was attempted,
caught by the suite (172 pass / 1 fail), and **reverted** rather than override a
human-installed gate.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — the `listed-item` branch
- `cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts` — the T9 freeze pin

## Task Breakdown

- [ ] Human decision on lifting the T9 freeze
- [ ] Widen to `/^\s*(?:[-*+]\s|\d+[.)]\s)/gm`
- [ ] Re-pin the T9 content hash if the freeze is retained in spirit
- [ ] Regression test: ordered list, `*` bullet and `+` bullet each satisfy `listed-item`

## 5. Verification Protocol (The Failing Test)

**Command:** `npx tsx --test test/lib/readiness-predicates.node.test.ts`

Red test: a section containing only `1. first` / `2. second` must satisfy
`section(1) has ≥1 listed-item`. Today it counts zero.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | ordered list, `*` bullet, `+` bullet each count |
| Integration tests | 0 | pure predicate over a document body |
| E2E / acceptance tests | 0 | covered by the unit cases |

---

## Prior work

- [[BUG-042]] — gate section index off by heading; same predicate family, same class of "the document looks fine, the parser disagrees".
- none found for the freeze interaction specifically.

## Context Source

**context_source:** verified codebase grounding — `readiness-predicates.ts:683`, the T9 freeze test, and a live failing gate result in a fresh consumer repo, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — blocked on a human decision about the T9 freeze**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
