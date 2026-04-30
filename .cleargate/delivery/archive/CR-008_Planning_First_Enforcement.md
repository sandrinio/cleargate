---
cr_id: CR-008
parent_ref: EPIC-008
parent_cleargate_id: "EPIC-008"
sprint_cleargate_id: "SPRINT-14"
status: Completed
sprint: SPRINT-14
milestone: M1
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: 0.5.0
updated_at_version: 0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T09:10:08Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-008
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T09:10:08Z
  sessions: []
---

# CR-008: Planning-First Enforcement — Hook Surfaces Doctor Output + Optional Edit Gate

## 0. Live Evidence (Why Now)

On 2026-04-26 the reporter ran a clean end-to-end test: `npx cleargate@0.5.0 init` in `/Users/ssuladze/Documents/Dev/CG_TESTING_v1`, then opened Claude Code with the prompt *"I want to build a website. It's going to be my resume, but with effects and sleek design. Check my LinkedIn page … then attached Profile.pdf"*.

Observed behavior:
- Claude Code did not triage. No Proposal, no Epic, no Story drafted.
- `.cleargate/delivery/pending-sync/` and `.cleargate/delivery/archive/` remained empty.
- Claude proceeded directly to `Write site/index.html` (18.8 KB, real portfolio markup).
- `cleargate doctor --session-start` ran but its output was discarded by the hook (`2>/dev/null`), so Claude never received the planning-first reminder it would have emitted.
- The PostToolUse hook fired *after* the write — too late to prevent it.
- No PreToolUse hook is registered for `Edit|Write` (only for `Task` subagent invocations).

Conclusion: ClearGate's "Triage first, draft second" rule lives in CLAUDE.md as advisory text. Because nothing programmatically intercepts the write, Claude weighs the user's literal request higher than the protocol and skips planning. **The framework's value prop is not being enforced.**

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "CLAUDE.md instructions are sufficient to enforce the triage-first rule." False in practice — see §0.
- `.claude/hooks/session-start.sh:15` discards `cleargate doctor --session-start` stdout via `2>/dev/null`. The hook was designed to surface gate state into the Claude session and currently silences itself.
- "PreToolUse `Task` matcher is enough." It isn't — `Edit|Write` is the surface where planning gets bypassed.

**New Logic (The New Truth):**

Two-phase intervention. Ship Phase A first; gate Phase B on real-world evidence that A is insufficient.

**Phase A — Heavy Injection (mandatory, ships first):**
1. `session-start.sh` stops piping `cleargate doctor --session-start` to `/dev/null`. Doctor output reaches Claude as a system-reminder-equivalent (per Claude Code hook conventions, stdout from SessionStart is injected into the session context).
2. `cleargate doctor --session-start` is extended with a "planning-first reminder" block that fires when:
   - `.cleargate/delivery/pending-sync/` contains zero approved story files **AND**
   - the repo is not in a sprint-active state (no `.cleargate/sprint-runs/.active` sentinel)
3. The reminder text is unambiguous (template; exact wording set in story):
   > Before any Edit/Write that creates user-facing code, you must:
   > (1) classify the request (Epic / Story / CR / Bug),
   > (2) draft a work item under `.cleargate/delivery/pending-sync/` from `.cleargate/templates/`,
   > (3) halt at Gate 1 (Proposal approval) for human sign-off.
   > Bypass this only if the user has explicitly waived planning *in this conversation*.

**Phase B — Hard Gate (opt-in, ships after Phase A measurement):**
1. New script `pre-edit-gate.sh` registered as PreToolUse hook on `Edit|Write`.
2. Reads `.tool_input.file_path` from stdin.
3. Whitelist (always allowed, no story required): `.cleargate/**`, `.claude/**`, `CLAUDE.md`, `MANIFEST.json`, `cleargate-planning/**`, `README.md`, `.gitignore`, `.gitkeep`, `package.json`, `package-lock.json`, dotfiles (`.env*`, `.npmrc`, `.editorconfig`).
4. For non-whitelist paths: exit 1 with a structured stderr message *unless*:
   - At least one approved story file exists in `pending-sync/` whose frontmatter `implementation_files:` list (glob-matched) covers the path being written, **OR**
   - Env var `CLEARGATE_PLANNING_BYPASS=1` is set (explicit user override; logged).
5. Default: hook is **disabled** in `settings.json` post-init; users opt in via `cleargate config set strict-gate true` (writes `"matcher": "Edit|Write"` block to settings.json). Reason: solo-onboarding repos and prototyping flows shouldn't be blocked by default; mature teams who want enforcement enable it explicitly.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: none direct. Phase A is a hook patch + doctor extension; Phase B is net-new.
- [x] Invalidate/Update Epic: parent is **EPIC-008** (Token Cost + Readiness Gates) — it owns `cleargate doctor` and the SessionStart surface. EPIC-008 was Abandoned per archive frontmatter; CR-008 reactivates the SessionStart-hook portion of its scope. Confirm with reporter before push.
- [ ] Database schema impacts: **No.**
- [ ] FLASHCARD impact: add card on completion — *"SessionStart hook discards doctor stdout via `2>/dev/null` → planning-first rule unreachable to Claude. Always pipe doctor stdout through to the agent."*
- [ ] Manifest impact: `pre-edit-gate.sh` (Phase B only) becomes a new tier-`hook` entry in `cleargate-planning/MANIFEST.json` with `overwrite_policy: always`.
- [ ] Cross-repo: the hook script is shipped by `cleargate init` into every downstream repo. Phase A patch must land in `cleargate-planning/.claude/hooks/session-start.sh` (the canonical scaffold), then republish.

## 3. Execution Sandbox

**Phase A (modify):**
- `cleargate-planning/.claude/hooks/session-start.sh:15` — remove `2>/dev/null`, decide on stdout vs stderr discipline (Claude Code injects stdout into context, so route doctor's user-facing block to stdout).
- `cleargate-cli/src/commands/doctor.ts` — extend `--session-start` mode to emit the planning-first reminder block when conditions in §1 Phase A item 2 are met. Keep current "blocked items" output (the "22 items blocked" surface seen in the dogfood repo).
- `cleargate-cli/test/commands/doctor-session-start.test.ts` — new scenarios for (a) reminder fires on empty delivery, (b) reminder suppressed when sprint-active sentinel present, (c) reminder suppressed when at least one approved story exists in pending-sync.

**Phase B (create, behind feature flag):**
- `cleargate-planning/.claude/hooks/pre-edit-gate.sh` — new script. ~80 lines bash. Reads stdin JSON, parses `tool_input.file_path`, checks whitelist + story coverage, exits 0 or 1. Logs every block decision to `.cleargate/hook-log/pre-edit-gate.log`.
- `cleargate-cli/src/commands/config.ts` — add `cleargate config set strict-gate <bool>` that idempotently mutates `.claude/settings.json` to register/unregister the PreToolUse Edit|Write entry.
- `cleargate-planning/MANIFEST.json` — add the new hook script entry.
- `cleargate-cli/test/scripts/test_pre_edit_gate.sh` — table-driven tests for whitelist, story-match, bypass env, malformed input, story-without-`implementation_files`.

**Out of scope:**
- Changing the four-agent contracts. Architect/Developer/QA/Reporter are unaffected.
- Any wiki-build / wiki-ingest behavior.
- BUG-008 (wiki-build-on-init seed) — separate item.

## 4. Verification Protocol

**Phase A acceptance:**
1. `cd <fresh empty dir> && npx cleargate@<new> init && open via Claude Code`.
2. Assert: SessionStart injects the planning-first reminder text into the session (visible as a system-reminder block at session top, mirroring the dogfood-repo "22 items blocked" surface).
3. Manual probe: prompt Claude with *"build me a website from this PDF"*. Assert Claude responds with a triage classification + asks for confirmation before any Edit/Write. If Claude still proceeds to Edit, Phase A failed and Phase B is justified.

**Phase B acceptance (when shipped):**
1. With `strict-gate true`: prompt that triggers Edit on a non-whitelist path **without** an approved story → hook exits 1, Claude reports the failure, no file is written. Confirm via `ls`.
2. Whitelist coverage: editing `.cleargate/delivery/pending-sync/STORY-NEW.md` succeeds.
3. Story-match coverage: with story declaring `implementation_files: ["src/foo.ts"]`, editing `src/foo.ts` succeeds; editing `src/bar.ts` fails.
4. Bypass: `CLEARGATE_PLANNING_BYPASS=1` set → hook exits 0, log entry written with `bypass=true`.
5. With `strict-gate false` (default): all writes pass regardless of story state.

**Test commands:**
- `cd cleargate-cli && npm run typecheck && npm test` — must be green.
- `cd cleargate-cli && bash test/scripts/test_pre_edit_gate.sh` (Phase B only) — bash table-driven.
- Manual smoke per acceptance steps above.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared (session-start.sh:15 silencing, missing PreToolUse Edit|Write hook).
- [x] All impacted downstream Epics/Stories are identified (EPIC-008 reactivation noted; no current pending stories blocked).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Phase A vs Phase B sequencing approved by human (one-shot vs A-first-then-measure).
- [ ] Default for Phase B (off vs on) approved — draft says off; user may want on.
- [ ] `approved: true` is set in the YAML frontmatter.
