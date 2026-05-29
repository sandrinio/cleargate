---
bug_id: BUG-031
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: null
carry_over: false
status: "Completed"
severity: P1-High
reporter: sandrinio
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-18T00:00:00Z
updated_at: 2026-05-18T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: cli/init
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-18T17:22:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Discovered 2026-05-18 while orchestrating a fresh `cleargate init` in
  /Users/ssuladze/Documents/Dev/pdf_processor via the relay peer session.
  The pdf_processor repo had no .cleargate/, no .claude/, no prior join.
  Immediately after `cleargate init` exited 0, `cleargate doctor
  --session-start` reported:
    ClearGate state: member (project: d18500c2-b6f8-44b0-9e77-c30d94c2ef51) — full surface enabled.
  That project_id is the meta-repo's project_id (verified by comparing
  against this session's own SessionStart banner). The pdf_processor repo
  never ran `cleargate join`. Membership was inferred from a global
  location (likely ~/.cleargate/participant.json or equivalent CLI-global
  config).

  This violates the state-machine contract established by CR-011
  (Capability_Gating_By_Membership): "fresh repos with no valid join
  token on disk MUST be pre-member; only `cleargate join <invite-url>`
  flips state to member, scoped to the project carried by that invite."

  Cross-repo project_id inheritance is dangerous because:
    1. The agent in the target repo (pdf_processor) will read the wrong
       project_id, and any `cleargate push` will silently push items into
       the meta-repo's PM tool project — cross-project contamination.
    2. The CLAUDE.md surface-gating directive ("if pre-member, ask for
       an invite URL") never triggers, so the user is never prompted
       to confirm which project this repo belongs to.
    3. Multi-tenant scenarios (one developer working on N customer
       projects from N repos) silently collapse to whichever project_id
       was last joined globally.
stamp_error: no ledger rows for work_item_id BUG-031
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T19:21:25Z
  sessions: []
---

# BUG-031: `cleargate init` inherits a project_id from global state, skipping `pre-member` for fresh repos

## 0.5 Open Questions

- **Question:** Where exactly is the leaking project_id stored — `~/.cleargate/participant.json`, `~/.config/cleargate/`, an env var, or a CLI-global keyring entry?
- **Recommended:** Audit `cleargate-cli/src/util/identity.ts` (and any equivalent participant-resolution path) plus the read path that `cleargate doctor --session-start` calls to compute `state`. The leak is whichever read happens BEFORE the per-repo `.cleargate/.participant.json` (in pdf_processor it was 116B — likely identity-only, no project_id field).
- **Human decision:** _populated during Brief review_

- **Question:** Is the intent that participant *identity* (email) is global but project membership is per-repo? Or is even identity supposed to be per-repo?
- **Recommended:** Identity (email) global is fine — that's the whole point of "inferred sandrinio@users.noreply.github.com from git config". But project_id must be per-repo and only set by an explicit `cleargate join` against this working directory.
- **Human decision:** _populated during Brief review_

- **Question:** What should `cleargate doctor --session-start` show in a fresh repo where global identity is known but no per-repo join has happened?
- **Recommended:** Treat as pre-member. Banner: `ClearGate state: pre-member (identity: sandrinio@users.noreply.github.com) — local planning enabled, sync requires join.` This preserves the value of "we already know who you are" while honoring the per-repo project boundary.
- **Human decision:** _populated during Brief review_

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** A fresh `cleargate init` in a directory with no prior `.cleargate/` and no per-repo participant file MUST leave the repo in `pre-member` state. `cleargate doctor --session-start` should emit:

```
ClearGate state: pre-member — local planning enabled, sync requires join.
```

per the CR-011 Capability Gating contract. The user must run `cleargate join <invite-url>` to bind this working directory to a project.

**Actual Behavior:** After `cleargate init` in `/Users/ssuladze/Documents/Dev/pdf_processor` (a fresh directory with only `PRD.md` and `.env`, no prior cleargate state), `cleargate doctor --session-start` reported:

```
ClearGate state: member (project: d18500c2-b6f8-44b0-9e77-c30d94c2ef51) — full surface enabled.
```

The project_id `d18500c2-b6f8-44b0-9e77-c30d94c2ef51` is the meta-repo's project_id — bleeding through from a global CLI location into a completely unrelated repo. The pdf_processor repo now claims membership in the meta-repo's PM-tool project; any `cleargate push` from pdf_processor would attempt to write items into the wrong project's adapter.

## 2. Reproduction Protocol

Deterministic on a host where the developer has previously joined any ClearGate project from any working directory:

1. `cd $(mktemp -d)` — fresh temp dir, no `.cleargate/`, no `.claude/`.
2. `git init -b main` — confirm pre-conditions.
3. `cleargate init` — exits 0, scaffold lands.
4. `cleargate doctor --session-start`

   **Observed:** banner reports `state: member (project: <SOME_OTHER_REPO_PROJECT_ID>)`.

   **Required:** banner must report `state: pre-member`.

5. `cat .cleargate/.participant.json`

   The per-repo participant file (~116 bytes) carries identity only — no `project_id`. So the project_id is being read from somewhere else (the leak source).

6. `find ~/.cleargate ~/.config/cleargate ~/Library/Application\ Support/cleargate 2>/dev/null` — locate the global file carrying `project_id`.

## 3. Evidence & Context

Relay-orchestrated reproduction, pdf-processor peer session, 2026-05-18:

```
[cleargate init] Done. Read CLAUDE.md and .cleargate/knowledge/cleargate-protocol.md to learn the protocol.

$ cleargate doctor --session-start
ClearGate state: member (project: d18500c2-b6f8-44b0-9e77-c30d94c2ef51) — full surface enabled.
cleargate CLI: PATH (global install) — cleargate
Triage first, draft second:
  ...

$ cat .cleargate/.participant.json
# 116 bytes — identity only, no project_id field
{ "email": "sandrinio@users.noreply.github.com", "inferred": true }
```

Comparison: meta-repo's own SessionStart banner from this conversation:

```
ClearGate state: member (project: d18500c2-b6f8-44b0-9e77-c30d94c2ef51) — full surface enabled.
```

Identical project_id. Two unrelated repos (meta-repo vs pdf_processor) reporting the same project — definitive proof of cross-repo leak.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate:**

- `cleargate-cli/src/lib/identity.ts` — the canonical participant/project resolution module. (Story spec originally said `util/identity.ts`; the canonical path is `lib/`. Patch applied 2026-05-19 per M1 plan §6 Open Decision 3.) Whichever lookup happens BEFORE consulting per-repo `.cleargate/.participant.json` is the leak source. Also audit `cleargate-cli/src/lib/membership.ts` — `getMembershipState()` reads `~/.cleargate/auth.json` and is the most likely leak surface per the M1 SDR investigation.
- `cleargate-cli/src/commands/doctor.ts` — the `--session-start` code path that emits the `state: member (project: …)` line. Verify the resolver prioritizes per-repo over global, and that absence of a per-repo `project_id` returns pre-member (NOT falls through to global).
- `cleargate-cli/src/commands/join.ts` — where is `project_id` written on a successful join? If it's written to a global file (e.g., `~/.cleargate/joined-projects.json`), that's the leak surface.
- `cleargate-cli/src/commands/init.ts` — does init read or seed any global project file? It should not.

**Do NOT touch:** identity (email) inference from git config. That's fine global-scope; only `project_id` must be per-repo.

## 5. Verification Protocol (The Failing Test)

**New test file:** `cleargate-cli/test/integration/init-pre-member-isolation.node.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

test('cleargate init in a fresh repo reports pre-member even when a global project_id exists', () => {
  // Arrange: seed a global participant with a project_id (simulating prior join in another repo)
  const fakeHome = mkdtempSync(join(tmpdir(), 'cg-home-'));
  execSync(`mkdir -p ${fakeHome}/.cleargate && echo '{"email":"x@y","project_id":"FAKE-GLOBAL-PID"}' > ${fakeHome}/.cleargate/participant.json`);

  const repo = mkdtempSync(join(tmpdir(), 'cg-repo-'));
  execSync('git init -b main', { cwd: repo, env: { ...process.env, HOME: fakeHome } });

  // Act
  execSync('cleargate init', { cwd: repo, env: { ...process.env, HOME: fakeHome } });
  const banner = execSync('cleargate doctor --session-start', { cwd: repo, env: { ...process.env, HOME: fakeHome } }).toString();

  // Assert
  assert.match(banner, /ClearGate state: pre-member/);
  assert.doesNotMatch(banner, /FAKE-GLOBAL-PID/);
});
```

**Command:** `cd cleargate-cli && npm test -- --grep init-pre-member-isolation`

**Manual verification:**
1. On the bug-fix branch, reproduce step 2.1-2.4 above.
2. Banner MUST read `pre-member`.
3. Run `cleargate join <valid-invite>` then re-run doctor — banner MUST flip to `member (project: <invite's pid>)`.
4. `cd ..` to another fresh dir, run `cleargate init`, doctor MUST still read pre-member.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — leak source (which file carries the leaking project_id) is hypothesized but not yet localized.

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] Leak source (file/path) localized — pending grep of `cleargate-cli/src/`.
- [ ] `approved: true` is set in the YAML frontmatter.
