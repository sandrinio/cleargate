---
bug_id: BUG-053
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P1-High
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — direct inspection of cleargate-cli/.git/hooks and git config during EPIC-054 M1 planning; surfaced by the M1 Architect and independently confirmed
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
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
  last_gate_check: 2026-08-27T14:12:39Z
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

# BUG-053: Commits made inside cleargate-cli are completely ungated

### Open Questions

- **Question:** Should `cleargate-cli` get its own hook, or should the outer hook learn to run from a nested repo?
- **Recommended:** Its own hook. The outer `pre-commit` resolves `.cleargate/**` relative to the repo root; invoked from inside `cleargate-cli` those paths do not exist. A nested-aware outer hook is the larger change and the easier one to get subtly wrong.
- **Human decision:** {populated during Brief review}

- **Question:** Does this affect end-user installs, or only this meta-repo's dogfood layout?
- **Recommended:** Unknown and worth checking before sizing the fix. If `cleargate init` never installs a hook into a nested package repo, every consumer with a nested package has the same hole. If the hole is specific to the 2026-05-31 planning-only split (three products re-cloned side-by-side, hooks never re-installed), it is a local repair.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `Never --no-verify` is a load-bearing rule. Every commit that touches shipped code
runs typecheck, the test suite, the file-surface gate, and the two payload-grammar guards
(`check:no-vitest`, `check:no-inline-id-regex`) before it lands.

**Actual Behavior:** `cleargate-cli` has **no installed git hooks at all**. Every commit made from that
checkout bypasses all of the above — silently, with no warning, and without anyone passing `--no-verify`.

The rule is not being broken. It is **vacuous**: there is no hook to bypass.

## 2. Reproduction Protocol

From the repo root, read-only:

- `ls -la cleargate-cli/.git/hooks/ | grep -v '\.sample'` → only `.` and `..`. No `pre-commit`.
- `git -C cleargate-cli config --get core.hooksPath` → exits 1, prints nothing. No alternate hooks dir.
- Contrast the outer repo: `ls .git/hooks/ | grep -v '\.sample'` → `pre-commit`.

Then confirm the consequence on real commits: the three STORY-054-05 commits (`7778722`, `c79f615`, and the
merge `db13a03`) were all made from the `cleargate-cli` checkout and were therefore ungated. They happen to
be green — verified independently by the Developer, QA-Verify, DevOps, and the orchestrator — but that was
discipline, not enforcement.

## 3. Evidence & Context

```
$ ls -la cleargate-cli/.git/hooks/ | grep -v '\.sample'
total 128
drwxr-xr-x@ 16 ssuladze  staff   512 May 31 15:56 .
drwxr-xr-x@ 14 ssuladze  staff   448 Aug 27 17:47 ..

$ git -C cleargate-cli config --get core.hooksPath
$ echo $?
1

$ ls .git/hooks/ | grep -v '\.sample'
pre-commit
```

Note the hooks directory mtime: **May 31 15:56** — the date of the planning-only split, when
`cleargate-cli`, `mcp`, and `admin` were split out and re-cloned side-by-side. The hooks were never
installed in the fresh clones. `mcp/` and `admin/` should be checked for the same hole.

**What IS still gated.** The outer repo's `pre-commit` hook is present, and `.cleargate/config.yml`
`gates.precommit` is
`npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test` — so a commit made in the
**outer** repo does run cli typecheck and the cli suite. The hole is specific to commits authored from
inside the nested repo, which is exactly how every cross-repo story in the current sprint commits its code
half.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/.git/hooks/` — the missing artifact (not a tracked path; the fix is whatever installs it).
- `cleargate-cli/src/init/` — determine whether `cleargate init` installs hooks at all, and whether it can
  target a nested package repo.
- `.cleargate/config.yml` `gates:` — the gate command definitions the hook consumes.
- `mcp/.git/hooks/` and `admin/.git/hooks/` — check for the same hole; do not fix blind.

**Explicitly NOT in scope:** installing a hook into `cleargate-cli` while a sprint is in flight. The outer
hook resolves `.cleargate/**` against its own root and would misbehave invoked from the nested repo; a
mid-sprint install risks blocking Developer commits in a way nobody has tested.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/scaffold/hook-install-parity.node.test.ts`

The test does not exist yet. It should assert that every git repo the scaffold claims to gate actually has a
`pre-commit` hook installed (or a configured `core.hooksPath` containing one) — asserting the *presence of
enforcement*, not merely that the rule is written down somewhere. A test that only greps documentation for
the phrase "never --no-verify" would pass today, which is precisely the failure mode.

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- [[CR-049]] — audited canonical-vs-live drift and explicitly *rejected* a pre-commit hook in favour of an
  npm test scenario, on the grounds that a hook "would block legitimate one-side edits during a story".
  Closest prior art on hook policy; it did not check whether the hooks that were assumed to exist actually
  did.
- [[BUG-051]] — filed the same day from the same sweep; also a case of an assumed-enforced invariant that
  nothing enforces.
- [[BUG-046]] — established that `cleargate-cli` has zero tracked files in the outer repo and does not
  materialise in worktrees. Same structural cause: the nested repo is invisible to outer-repo tooling.

## Context Source

> Discovery audit.

**context_source:** verified codebase grounding — surfaced by the M1 Architect during EPIC-054 milestone
planning and independently re-confirmed by the orchestrator via direct `ls` and `git config` inspection
before filing. No prior epic approval; filed for triage.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — named, but the test does not exist and its scope
      depends on the mcp/admin answer in Open Questions.
- [ ] `approved: true` is set in the YAML frontmatter.
