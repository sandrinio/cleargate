---
bug_id: BUG-065
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P3-Low
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — surfaced while resolving CR-108's template-mapping question during SPRINT-39 wave 10; the type registry, the templates directory, the wiki bucket config and the live corpus were each read directly; no prior approval, filed for triage
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 1f215c2e-dirty
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
  last_gate_check: 2026-08-29T10:54:39Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-065: `proposal` is a registered, actively-used work-item type with no authoring template

## 1. The Anomaly (Expected vs. Actual)

`proposal` is a first-class work-item type by every registry that defines one:

- `cleargate-cli/src/lib/work-item-type.ts:8` lists it in `WorkItemType`.
- `cleargate-cli/src/lib/work-item-id.ts` carries **both** `PROPOSAL` and the legacy `PROP` prefix
  in `TYPE_PREFIXES`, with `normalise()` mapping `PROP-013` → `PROPOSAL-013`.
- `.cleargate/config.yml` declares `proposals` in `wiki.ingest_buckets`.
- The corpus holds **16** `PROPOSAL-*`/`PROP-*` items and **15** compiled `wiki/proposals/` pages.

**Expected:** `.cleargate/templates/` contains a `proposal` template, as it does for the other
eight types.

**Actual:** it does not. The directory holds `story.md`, `epic.md`, `CR.md`, `Bug.md`,
`initiative.md`, `hotfix.md`, `spike.md`, `Sprint Plan Template.md`, plus the two non-authoring
files `sprint_context.md` and `sprint_report.md`. **There is no proposal template in either tree.**

The sixteen existing proposals were therefore authored without one — by hand, or from a template
that has since been removed. Nothing detects the gap: no gate, no lint, no test asserts that every
registered type has a template.

## 2. Reproduction Protocol

1. **Show the type is registered.**

```bash
sed -n '8p' cleargate-cli/src/lib/work-item-type.ts
command grep -n "'PROPOSAL'\|'PROP'" cleargate-cli/src/lib/work-item-id.ts
command grep -A8 'ingest_buckets' .cleargate/config.yml
```

2. **Show the template is absent, in both trees.**

```bash
ls -1 .cleargate/templates/
ls -1 cleargate-planning/.cleargate/templates/
#   no proposal.md in either
```

3. **Show the type is live, not vestigial.**

```bash
ls .cleargate/delivery/pending-sync/ .cleargate/delivery/archive/ | command grep -cE '^(PROPOSAL|PROP)-'
#   16
ls .cleargate/wiki/proposals/ | wc -l
#   15
```

4. **Show nothing detects the gap** — assert coverage of the nine registered types against the
   templates directory and observe there is no such check anywhere in the repo.

```bash
command grep -rn 'templates' cleargate-cli/src/lib/readiness-predicates.ts | head
command grep -rln 'proposal\.md' cleargate-cli/src .cleargate/scripts || echo 'no reference to a proposal template anywhere'
```

## 3. Evidence & Context

- **Failure is silent and has been for the life of the corpus.** Sixteen items exist; none of them
  could have been scaffolded, and nothing ever raised.
- **CLAUDE.md's own template list omits it**: *"Use the templates in `.cleargate/templates/`
  (`epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`,
  `spike.md`)"* — seven named for nine registered types. `Sprint Plan Template.md` covers `sprint`,
  `hotfix.md` is unlisted but present, and `proposal` is absent from both the list and the disk.
- **This blocks [[CR-108]] from meaning what it says.** That CR's headline is *"one scaffolder for
  every work-item type"*. It cannot scaffold `proposal`. CR-108's own resolution — ruled during
  SPRINT-39 wave 10 — is to reject `proposal` with a named error rather than fall through, and to
  leave the template to this item.
- **Same family as [[BUG-051]]** (work-item registries drifted): several registries that must agree
  about the set of types, with no mechanical check that they do. [[BUG-064]] and [[BUG-063]] are the
  same shape one level down — gates whose derived values are wrong rather than absent.
- Severity is **P3-Low** because the corpus is already authored and nothing is currently broken; it
  becomes P2 the moment `cleargate new` ships, because that is when a user first asks the tool for
  something it cannot give them.

## 4. Execution Sandbox (Suspected Blast Radius)

- `.cleargate/templates/` — the new template, plus its `cleargate-planning/` mirror.
- `CLAUDE.md` + `cleargate-planning/CLAUDE.md` — the template list in the *Drafting work items*
  section, which is short by two entries.
- Optionally `cleargate-cli/src/lib/readiness-predicates.ts` — a gate registration, if proposals
  are to have a readiness gate like the other types.

**Do NOT modify:** `work-item-type.ts`, `work-item-id.ts`, or `config.yml`. The registries are
**correct**; the template is what is missing. Removing `proposal` from a registry to close the gap
would orphan sixteen live items and fifteen wiki pages.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

1. **The failing test.** A test asserting every type in `work-item-type.ts`'s `WorkItemType` union
   resolves to a file in `.cleargate/templates/`. **Must fail against the current tree**, naming
   `proposal`. This is the check whose absence let the gap persist, so it matters more than the
   template itself.
2. Template resolution is asserted **case-sensitively**, against a `readdirSync` listing rather than
   `existsSync` — `cr` → `CR.md` and `bug` → `Bug.md` resolve on case-insensitive macOS and fail on
   Linux, so an `existsSync` check passes on the developer's machine and ships broken.
3. The same assertion runs against `cleargate-planning/.cleargate/templates/`, so the shipped
   scaffold cannot drift from the live one.
4. Regression: the eight existing types still resolve, and `Sprint Plan Template.md` still maps to
   `sprint` despite carrying no type token in its filename.
5. If a `proposal.md` is authored, it carries an `<instructions>` block and an Ambiguity Gate
   footer consistent with the other eight, and `cleargate gate check` passes on an item rendered
   from it.

## Prior work

- `cleargate wiki query "proposal template work item type registry"` → **none found**.
- [[BUG-051]] — work-item registries drifted. Direct ancestor; same class, different registries.
- [[CR-108]] — `cleargate new <type>`; this gap is why its claim had to be narrowed, and its wave-10
  ruling explicitly defers the template here.
- [[BUG-063]], [[BUG-064]] — gates whose derived values are wrong rather than absent. Same silent
  failure shape.
- No prior item covers the missing proposal template.

## Context Source

**context_source:** Surfaced on 2026-08-29 while resolving [[CR-108]]'s template-mapping question
during SPRINT-39 wave 10, after the BUG-045 Architect post-flight found the template map is not
`${type}.md`. The type registry, both templates directories, `config.yml`'s `ingest_buckets`, and
the live corpus counts were each read directly rather than inferred. Not folded into CR-108: that
CR's surface is the scaffolder, and authoring a work-item template is doctrine work with its own
gate-registration question.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] Decided whether `proposal` gets a readiness gate registration alongside the template, or template-only.
- [ ] `approved: true` is set in the YAML frontmatter.
