---
cr_id: CR-009
parent_ref: EPIC-009
parent_cleargate_id: "EPIC-009"
sprint_cleargate_id: "SPRINT-14"
status: Completed
sprint: SPRINT-14
milestone: M1
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T09:10:00Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  User direct request 2026-04-26 — proposal gate waived (sharp intent; user explicitly framed
  the problem and asked for a CR).
  Surfaced from a parallel CG_TESTING_v1 session: `npx cleargate init` produced a working
  scaffold but the user's downstream Claude Code session never saw any wiki/gate activity
  because `cleargate` was not on PATH. BUG-006's fix (commit a0d8acc) converted the prior
  ENOENT module-not-found errors into a silent `exit 0` — better hygiene, same user-visible
  failure mode: hooks no-op, wiki stays empty, no error reaches the agent.

  This CR addresses the *root cause* of the npx-only install gap: the generated hooks rely
  on `command -v cleargate` and have no working fallback when the user installed via
  `npx cleargate init` (one-shot) and never globally installed the package.
stamp_error: no ledger rows for work_item_id CR-009
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T09:10:00Z
  sessions: []
---

# CR-009: Hook CLI Resolution — Pin Invocation via `npx @cleargate/cli@<version>` + Loud Preflight

## 0. Live Evidence (Why Now)

CG_TESTING_v1 session, 2026-04-26: user ran `npx cleargate@0.5.0 init` in a fresh directory, then opened Claude Code. Observed:
- `cleargate-cli/dist/cli.js` is absent in the target (init does not bundle the CLI dist — by design, see BUG-006 §4 sandbox item 5).
- `cleargate` is not on PATH (no `npm i -g cleargate` was performed; npx is one-shot).
- Both `stamp-and-gate.sh` and `session-start.sh` therefore hit the third branch of their resolver and `exit 0` silently. The remediation log line in `stamp-and-gate.sh:15` writes to `.cleargate/hook-log/gate-check.log` — a file the user has zero reason to read until something is already broken.
- Net effect: the wiki never compiles, gates never run, doctor never surfaces, and from the user's perspective ClearGate appears to do nothing. CR-008's planning-first reminder (also gated on doctor stdout) does not surface either.

Post-BUG-006, the failure is no longer a stack trace — it is the **absence of any signal**. That is worse for diagnosis: the user can't even tell something failed.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "Hooks should resolve `cleargate` from PATH and silently no-op when absent." False premise. The most common install path for first-time users is `npx cleargate init` — which never puts `cleargate` on PATH. Silent no-op = invisible failure.
- "A logged remediation line in `gate-check.log` is sufficient user signal." It isn't. Users don't grep hook logs proactively; the log is read post-hoc when something else has already gone wrong.
- BUG-006's resolver order (`command -v cleargate` → `cleargate-cli/dist/cli.js` → exit 0) was the right shape but the wrong third branch.

**New Logic (The New Truth):**

Two changes — both ship together. Neither is useful without the other.

**Change 1 — Pin invocation via `npx -y @cleargate/cli@<version>` as the resolver tail.**

`cleargate init` writes the version it was invoked at into the generated hook scripts. Resolver order becomes:
1. `cleargate-cli/dist/cli.js` exists (meta-repo dogfood) → use it.
2. `command -v cleargate` succeeds (global install / shimmed) → use it.
3. Fall back to `npx -y @cleargate/cli@<PINNED_VERSION>` — always works wherever Node is present (Claude Code itself requires Node, so this is a safe assumption).

The pin is stamped at init time, not at hook fire time. This means:
- Each downstream repo invokes a deterministic CLI version (no surprise upgrades on hook fire).
- `cleargate upgrade` (EPIC-009 scope) re-stamps the pin to the new version — the upgrade three-way merge driver gets one more thing to reconcile.
- `cleargate init --pin <ver>` flag (optional; nice-to-have) lets a user freeze to a specific version.

Cost: ~300–800 ms npx cold start on first hook fire; npm cache warms it after that. Acceptable for PostToolUse + SessionStart (neither is a hot path). Unacceptable for any future per-keystroke hook — flagged for that case if it ever exists.

**Change 2 — Loud preflight at the end of `cleargate init`.**

After the scaffold is written, `cleargate init` runs the resolver chain end-to-end against a synthetic `--probe` invocation: `<resolved-CG> --version`. If it succeeds, init prints a green checkmark. If it fails, init exits non-zero with structured remediation (which branch failed, what to do). This converts "invisible silent no-op at first hook fire" into "loud failure at install time, when the user is still watching the terminal."

Additionally: `cleargate doctor --session-start` (already extended by CR-008) probes the same chain on every session start and surfaces a one-line status block: `🟢 cleargate CLI: npx @cleargate/cli@0.5.0 (cold-start ~600ms first call)` or `🔴 cleargate CLI: not resolvable — hooks will no-op. Fix: npm i -g cleargate`. The block is always emitted, not just on failure, so the user sees what the hooks will use *before* anything fires.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: none direct. Patch is to two hook scripts + init's tail logic + doctor's session-start block.
- [x] Invalidate/Update Epic: parent is **EPIC-009** (Scaffold Manifest + Uninstall). The pinned-version stamping intersects with EPIC-009's upgrade three-way merge driver — coordinate so `cleargate upgrade` re-stamps the pin without conflict-marker pollution.
- [x] CR-008 interaction: CR-008 plans to surface `cleargate doctor --session-start` stdout into the session. This CR adds one more block to that stdout. Sequencing: CR-008 ships first (or concurrently); the resolver-status block is gated behind CR-008's stdout-routing fix or it goes to `/dev/null` again.
- [x] BUG-006 interaction: this CR replaces the third branch of BUG-006's resolver (`exit 0` → `npx -y @cleargate/cli@<PIN>`). BUG-006's fix stays in for the first two branches and remains correct.
- [ ] Database schema impacts: **No.**
- [ ] FLASHCARD impact: add card on completion — *"Hook resolvers must have a working tail branch, not exit 0 — `npx -y @cleargate/cli@<PIN>` survives the npx-only-install case. Silent no-op = invisible failure."*
- [ ] Manifest impact: `cleargate-planning/MANIFEST.json` entries for `stamp-and-gate.sh` + `session-start.sh` need an `overwrite_policy: pin-aware` (or equivalent) so user edits to pinned-version lines are not blown away on `cleargate upgrade`. If too complex for this CR, fall back to `overwrite_policy: always` and document that local hook edits don't survive upgrades — the pin-stamp is the canonical source.
- [ ] Cross-repo: every existing downstream install (CG_TESTING_v1 + any others) is shipped pre-fix. They will only pick up the new resolver after `cleargate upgrade` lands. Document this in the CR-009 ship note: "Existing installs continue to no-op silently until upgraded."

## 3. Execution Sandbox

**Modify:**

- `cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh:14-17`
  - Replace the `else / log-and-exit-0` branch with a `CG=(npx -y "@cleargate/cli@__CLEARGATE_VERSION__")` assignment.
  - The `__CLEARGATE_VERSION__` token is a placeholder substituted at init time (see init.ts change below).
- `cleargate-cli/templates/cleargate-planning/.claude/hooks/session-start.sh:11-13`
  - Same replacement pattern; same placeholder token.
- `cleargate-cli/src/init/copy-payload.ts` (or the closest call site that streams hook scripts from template → target)
  - After copying each hook script, perform a single in-place substitution: `__CLEARGATE_VERSION__` → the version read from `cleargate-cli/package.json` (or from a `--pin <ver>` CLI flag if provided).
  - One pass, no template engine — straight `String.prototype.replaceAll`.
- `cleargate-cli/src/commands/init.ts`
  - At the end of the init flow, run the synthetic probe: build the resolver chain in JS, fork the resolved invocation with `--version`, capture stdout/stderr/exit-code, and print a green/red status line. Non-zero exit code on probe failure (preserves init's overall exit code policy — currently zero on success).
  - Add an `--pin <ver>` flag (optional) that overrides the default of "current package version" when stamping the placeholder.
- `cleargate-cli/src/commands/doctor.ts`
  - Extend `--session-start` mode to emit a one-line resolver-status block (always, not just on failure). Probes the same resolver chain at runtime, prints which branch wins and the cold-start cost estimate.
- `cleargate-cli/src/commands/upgrade.ts` (only if EPIC-009's upgrade command already exists; otherwise defer to that epic)
  - Re-stamp `__CLEARGATE_VERSION__` placeholders in target's hook scripts to the new version on upgrade. Three-way merge driver must treat the pin line as machine-managed, not user-managed.

**Tests:**
- `cleargate-cli/src/init/__tests__/copy-payload.cli-resolution.test.ts` — extend the BUG-006 test to additionally assert (a) the placeholder is fully substituted (no `__CLEARGATE_VERSION__` left in the target), (b) the substituted version matches `package.json`'s, (c) the third resolver branch is `npx -y @cleargate/cli@<ver>`, never `exit 0`.
- `cleargate-cli/src/commands/__tests__/init.probe.test.ts` (new) — the probe runs and exits non-zero when neither branch resolves; exits zero on at least one branch resolving.
- `cleargate-cli/src/commands/__tests__/doctor.session-start.test.ts` (extend) — resolver-status block is present in stdout; correctly identifies which branch wins.
- Manual smoke: `cd /tmp && mkdir cg-cr009 && cd cg-cr009 && git init -q && npx cleargate@<next> init --yes` — observe the green probe line; observe `.cleargate/hook-log/gate-check.log` is written on first delivery edit.

**Out of scope:**
- Changing `cleargate-cli/scripts/copy-planning-payload.mjs` payload boundary. Bundling the CLI dist into init's payload is a different design choice (BUG-006 §4 item 5); this CR explicitly takes the "npm-native distribution" path instead.
- Native binary distribution (Bun compile / pkg / homebrew). Worth revisiting only if Claude Code itself stops requiring Node.
- Changing CR-008's planning-first reminder logic. This CR adds a sibling block to doctor's stdout, nothing more.

## 4. Verification Protocol

**Acceptance:**

1. **Fresh install, no global `cleargate`:**
   ```bash
   cd $(mktemp -d) && git init -q
   npx cleargate@<next> init --yes
   ```
   - Init's tail prints `🟢 cleargate CLI resolved via npx @cleargate/cli@<ver>` (or whichever branch wins). Exit code 0.
   - `.claude/hooks/stamp-and-gate.sh` and `session-start.sh` contain the literal pinned version string in the `npx -y …` line — no `__CLEARGATE_VERSION__` placeholder remains.
   - Open Claude Code in the dir; SessionStart hook surfaces a `cleargate CLI:` status block in the session.
   - Trigger a PostToolUse: `echo '---\nbug_id: BUG-X\n---' > .cleargate/delivery/pending-sync/BUG-X.md` (or use Edit/Write tool from within the session).
   - `cat .cleargate/hook-log/gate-check.log` shows `stamp=0 gate=0 ingest=0` on the trigger line — first hook fire may take ~600 ms (cold npx); subsequent fires are fast.

2. **Resolver branch override (dogfood case):**
   - In the meta-repo (`Documents/Dev/ClearGate`), the existing `cleargate-cli/dist/cli.js` is preferred over npx. Run any `.cleargate/delivery/**` Edit; ledger should write via the local dist, not npx (verify by `ps` during a probe, or by adding a debug line to a test build).

3. **Doctor surface:**
   - `cleargate doctor --session-start` emits the resolver-status block exactly once, in the structured format defined in §1 Change 2. Tested in CG_TESTING_v1 + meta-repo: both report a 🟢 status (different branches).

4. **Failure surface (deliberate breakage):**
   - `PATH=/usr/bin cleargate doctor --session-start` (strip npx + node) → block reports `🔴 cleargate CLI: not resolvable`. Init's probe under the same constrained PATH exits non-zero with the same structured remediation message.

5. **Upgrade re-stamps the pin (only if EPIC-009 upgrade command is live):**
   - Install at v0.5.0, then `cleargate upgrade` to v0.5.1; assert hook scripts now contain `@cleargate/cli@0.5.1`. Three-way merge driver does not produce conflict markers around the pin line.

**Test commands:**
- `cd cleargate-cli && npm run typecheck && npm test` — must be green.
- `cd cleargate-cli && npm test -- copy-payload.cli-resolution init.probe doctor.session-start` — focused suite.
- Manual smoke per acceptance steps 1–4 above (step 5 only if upgrade is live).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared (BUG-006 resolver tail; logged-line-as-signal premise).
- [x] All impacted downstream Epics/Stories/CRs identified (EPIC-009 upgrade interaction; CR-008 stdout-routing dependency; BUG-006 resolver branches 1–2 retained).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Confirm the placeholder substitution approach (`__CLEARGATE_VERSION__` straight string replace) vs. a `.template.sh` extension + render step. Straight replace is simpler; extension + render is more honest about generation. Pick one.
- [ ] Confirm the `--pin <ver>` flag is in scope for this CR or deferred. Recommendation: in scope (cheap; surfaces a useful escape hatch).
- [ ] Confirm CR-008 ships before or with this CR. If it slips, the resolver-status block goes to `/dev/null` and the loud-preflight value is reduced to init-time only.
- [ ] `approved: true` is set in the YAML frontmatter.
