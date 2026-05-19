---
cr_id: CR-068
parent_ref: EPIC-021
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
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
  last_gate_check: 2026-05-19T14:46:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Observed 2026-05-18 during a fresh `cleargate init` in
  /Users/ssuladze/Documents/Dev/pdf_processor (Node 25.9.0). Init exited 0
  but emitted:

    (node:81135) [DEP0190] DeprecationWarning: Passing args to a child
    process with shell option true can lead to security vulnerabilities,
    as the arguments are not escaped, only concatenated.

  The warning fires once per run, mid-log, between "🟢 cleargate CLI
  resolved via PATH" and "Participant identity:". Cosmetic for now, but
  DEP0190 will become a hard error in a future Node major. We should fix
  before that lands and also tighten the security smell now.
stamp_error: no ledger rows for work_item_id CR-068
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:46:46Z
  sessions: []
---

# CR-068: Silence DEP0190 by switching `cleargate init` child_process calls off `shell: true`

## 0.5 Open Questions

- **Question:** Which call site inside `cleargate init` uses `shell: true` + an args array? Likely one of: (a) the PATH-resolution probe that emitted `🟢 cleargate CLI resolved via PATH (global install)`, (b) the participant-identity inference via `git config user.email`, or (c) the MCP server availability check.
- **Recommended:** Grep `cleargate-cli/src/commands/init.ts` and any helper imports for `spawn(`, `exec(`, `execSync(`, `shell: true`. The pattern `spawn(cmd, args, { shell: true })` is the exact trigger for DEP0190 — the fix is to either drop `shell: true` (preferred) or switch to `spawn(cmd, { shell: true })` with the args interpolated into `cmd` (only acceptable when args are trusted constants and properly quoted).
- **Human decision:** _populated during Brief review_

- **Question:** Are there other CLI commands (upgrade, doctor, join) with the same anti-pattern?
- **Recommended:** Audit-and-fix in one CR. The grep is cheap; better to evict the pattern from the whole CLI than play whack-a-mole.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Pattern `spawn(cmd, [args], { shell: true })` anywhere in `cleargate-cli/src/**`. Node DEP0190: "the arguments are not escaped, only concatenated" — this is a real shell-injection surface when any element of `args` is derived from user input or environment.

**New Logic (The New Truth):**
- For trusted commands with simple args: `spawn(cmd, args, { shell: false })` (the default). No shell interpolation, no DEP0190, no injection risk.
- For commands that genuinely need shell features (pipes, redirects, globs): `spawn(fullCommandString, [], { shell: true })` — args inline in the command string with explicit quoting. But prefer to refactor away from this entirely (pipes can be done with two spawns + .pipe()).

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — CR-068 is self-contained.
- [ ] Invalidate/Update Epic: link EPIC-021 (Solo Onboarding DX) for tracking. No body changes required.
- [ ] Database schema impacts? No.
- [ ] User-visible behavior change: Yes — DEP0190 warning disappears from `cleargate init` stdout. No functional change otherwise.
- [ ] Forward compatibility: Node 26+ may upgrade DEP0190 from warning to runtime throw. Fixing now prevents `cleargate init` from breaking when CI/dev workstations upgrade Node.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies.

- **Surface:** cleargate-cli/src/commands/init.ts — the init command body where the shell-true child-process call lives. Audit pending: grep for the deprecation trigger and remove.
- **Why this CR extends rather than rebuilds:** Pure call-site refactor inside existing child-process callers. No new abstraction, no new module. Smallest possible diff.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/init.ts` — replace `shell: true` call(s) with `shell: false` (default), passing args as array. If shell features are genuinely needed (rare), inline args into command string with manual quoting.
- Any util/helper file the audit identifies in answer to Open Question #1.
- `cleargate-cli/test/commands/init.test.ts` — add an assertion that `cleargate init` stdout does NOT contain `DEP0190` or `DeprecationWarning`.

**Do NOT touch:** behavior of init itself — file scaffold, bounded-block injection, MCP registration. This is a pure noise/security fix.

## 4. Verification Protocol

**Test 1 — no deprecation warning:**

```ts
test('cleargate init emits no DEP0190 warning', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'cg-'));
  execSync('git init -b main', { cwd: repo });
  const { stdout, stderr } = await spawnSync('cleargate', ['init'], { cwd: repo, encoding: 'utf8' });
  const combined = stdout + stderr;
  assert.doesNotMatch(combined, /DEP0190/);
  assert.doesNotMatch(combined, /DeprecationWarning/);
});
```

**Test 2 — grep gate (CI):** Add to `cleargate-cli/package.json` scripts: `"check:no-shell-true": "! grep -rn 'shell: true' src/ test/"` and wire it into `npm run check:all`. Prevents regression.

**Command:** `cd cleargate-cli && npm test && npm run check:no-shell-true`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — exact call site not yet localized; should be a single grep away.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified.
- [x] Execution Sandbox contains exact file paths (pending Open Question #1 resolution for any util helpers).
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] §2.5 Existing Surfaces cites at least one source-tree path the CR extends. — *cited init.ts; util helper TBD on audit.*
