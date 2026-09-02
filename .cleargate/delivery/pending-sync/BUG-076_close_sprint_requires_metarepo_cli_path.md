---
bug_id: BUG-076
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P0-Critical
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
  last_gate_check: 2026-09-02T00:08:17Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: sprint-scripts
---

# BUG-076: `close_sprint.mjs` requires a meta-repo-only CLI path, making Gate 4 unreachable for every consumer install

> **First-user field report,** 2026-09-02. Found by running a real sprint to
> Gate 4 in a fresh consumer repo installed from a `npm pack` tarball.
> **Fixed in the same run.** This is the most severe defect the dogfood surfaced:
> the documented lifecycle could not complete for the users the framework ships to.

### Open Questions

- **Question:** Resolve the CLI by candidate paths, or require callers to pass its location?
- **Recommended:** **Candidate paths.** The scaffold scripts are invoked directly by humans and agents with no place to thread a parameter through, and the two real locations are known and few. A resolver keeps every call site unchanged.
- **Human decision:** Accepted as recommended — `resolveCliBin()` added.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** a project that installed ClearGate can close its sprint.

**Actual Behavior:** `close_sprint.mjs` exits 1 before any gate runs:

```
dist not built — run `npm run build` in cleargate-cli/
  Expected: /Users/…/cg-lifecycle-20260902/cleargate-cli/dist/cli.js
  The lifecycle/orphan/parent-rollup/backsync/merge gates require a built CLI dist.
```

The path it demands sits at the CONSUMER's project root. It exists only in the
ClearGate meta-repo, where the CLI source tree lives beside the planning
scaffold. A consumer install has the CLI at `node_modules/cleargate/dist/cli.js`.
There was no fallback, so the check could never pass outside this repo.

The advice in the message is also unactionable for that user: there is no
`cleargate-cli/` directory in their project to run `npm run build` in.

## 2. Reproduction Protocol

1. `mkdir /tmp/repro && cd /tmp/repro && git init && npm init -y`
2. `npm install cleargate` (or a `npm pack` tarball), then `npx cleargate init`
3. Draft and approve a story, run a sprint to completion — or simply
   `node .cleargate/scripts/close_sprint.mjs SPRINT-01`
4. Observe the exit-1 above. `ls cleargate-cli/` → no such directory, and there
   never will be one.

## 3. Evidence & Context

`close_sprint.mjs:439` before the fix:

```js
const cliBinEarly = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
if (!fs.existsSync(cliBinEarly)) { …process.exit(1); }
```

Measured in the consumer repo:

```
expected by close_sprint : <project>/cleargate-cli/dist/cli.js   ABSENT — cannot exist
actual install location  : <project>/node_modules/cleargate/dist/cli.js   EXISTS
```

**Six** call sites used that literal path (`:439`, `:462`, `:519`, `:1279`,
`:1305`, `:1363`) plus **two** dynamic library imports of
`dist/lib/lifecycle-reconcile.js` — one keyed off `REPO_ROOT`, one off
`SCRIPTS_DIR/../..`, which is why a grep for the first pattern missed the second.

**The only escape was a test seam that disables real gates.**
`CLEARGATE_SKIP_LIFECYCLE_CHECK=1` bypasses the assertion but also skips Step 2.6
lifecycle reconciliation and Step 2.6b orphan drift. Closing a sprint that way
means turning off two enforcement gates to route around a path bug.

Same family as [[BUG-070]] and [[BUG-073]] — a hardcoded dogfood path with no
`node_modules` fallback — but terminal rather than degrading.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — all CLI path references

Audit the other scaffold scripts for the same pattern; this bug was found in one
script, and the pattern is not obviously unique to it.

## Task Breakdown

- [x] Add `resolveCliBin(repoRoot, rel)` checking the meta-repo path then `node_modules/cleargate/dist`
- [x] Replace all six `cli.js` call sites and both library imports
- [x] Make every guard null-safe (`=== null`, not `fs.existsSync(null)`)
- [x] Rewrite the error message to name both locations and an actionable fix
- [ ] Audit remaining scaffold scripts for the same hardcoded pattern
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug076_close_cli_resolution.red.sh`

Red test: build a fixture project containing `node_modules/cleargate/dist/cli.js`
and NO `cleargate-cli/` directory; run `close_sprint.mjs` against a terminal
sprint; assert it proceeds past the dist check. Before the fix it exits 1 with
"dist not built".

Second: assert a project with NEITHER location still exits 1, and that the
message names both paths.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | resolver finds the node_modules path; returns null when neither exists |
| Integration tests | 1 | full close in a consumer-shaped fixture proceeds past the dist gate |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[BUG-070]] — the CLI resolver skipping `node_modules/.bin` in init and the shipped hooks. Same root cause, degrading rather than fatal.
- [[BUG-073]] — `sprint preflight` shelling out to a bare `cleargate`, mixing two builds in one command. Same family, turned inward.
- [[BUG-006]] — scaffold hooks referencing a non-existent `cleargate-cli/dist/cli.js` in downstream repos. **This is the same defect class BUG-006 fixed for hooks, still live in the close script three years of sprints later.**

## Context Source

**context_source:** verified codebase grounding — `close_sprint.mjs` CLI path references read directly, a measured consumer-repo reproduction showing the expected path absent and the node_modules path present, and a successful close after the fix, all 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — fixed and verified 2026-09-02**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
