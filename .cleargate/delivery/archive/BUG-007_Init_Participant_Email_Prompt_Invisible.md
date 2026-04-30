---
bug_id: BUG-007
parent_ref: STORY-010-01
parent_cleargate_id: "STORY-010-01"
status: Verified
severity: P2-Medium
reporter: sandrinio
approved: true
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: 0.5.0
updated_at_version: 0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-25T22:12:44Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-007
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T22:16:18Z
  sessions: []
---

# BUG-007: `cleargate init` Participant Email Prompt is Invisible

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When `cleargate init` reaches the participant identity step, the user sees an unambiguous prompt that signals the CLI is waiting for input — distinct from the preceding `[cleargate init] Created ...` info log lines, with the cursor sitting on the same line as the question so typed input is visible adjacent to the prompt.

**Actual Behavior:** The prompt line is rendered with the same `[cleargate init]` log prefix as every preceding info line and is followed by a `\n`, putting the cursor on a fresh blank line below. Visually it looks like the next status message; users (including the reporter on first install of v0.5.0 in `/Users/ssuladze/Documents/Dev/CG_TESTING_v1`) believe the install completed and walk away. The CLI hangs indefinitely.

Compounding factor: the default offered is the user's GitHub `noreply` address (e.g. `sandrinio@users.noreply.github.com`), which is not a usable identity. Users who do hit Enter to dismiss the "log line" silently accept a non-deliverable email.

## 2. Reproduction Protocol

1. `mkdir /tmp/cg-bug-007 && cd /tmp/cg-bug-007`
2. Run `npx cleargate@0.5.0 init`
3. Answer `y` to the first prompt (`Ok to proceed?`).
4. Observe the trailing line: `[cleargate init] Participant email [<your-noreply>]:` — same prefix as info logs, no shell prompt indicator, cursor on a new blank line below.
5. Confirm the process is hanging (`ps -p $(pgrep -f cleargate)`) — install has not finished.

## 3. Evidence & Context

User-pasted terminal transcript (CG_TESTING_v1, 2026-04-26):

```
[cleargate init] CLAUDE.md unchanged (block already up to date)
[cleargate init] Bootstrap: no items to ingest, skipping build
[cleargate init] Wrote install snapshot: .cleargate/.install-manifest.json
[cleargate init] Participant email [sandrinio@users.noreply.github.com]:
█  ← cursor blinks here on a fresh line; user assumed install done
```

Source of the formatting issue:

- `cleargate-cli/src/commands/init.ts:345` — `const question = `[cleargate init] Participant email [${defaultEmail}]:`;` reuses the info-log prefix and offers no visual cue of interactivity.
- `cleargate-cli/src/lib/prompts.ts:80` and `:31` — `stdoutFn(question + '\n');` writes a trailing newline, putting the cursor on a fresh line instead of inline with the prompt.

The same pattern affects `promptYesNo`, but the `(y/n)` text in the question carries enough signal that users typically respond. `promptEmail` has no such textual signal.

Related prior context: FLASHCARD `2026-04-25 · #cli #readline #vitest` warns that `readline.createInterface` buffers ahead — fix must keep the same single-interface pattern; do not introduce a second readline.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/prompts.ts` — both `promptYesNo` (line 31) and `promptEmail` (line 80): replace `question + '\n'` with `question + ' '` so the cursor lands inline.
- `cleargate-cli/src/commands/init.ts:345` — replace the prompt text. Drop `[cleargate init]` prefix; use a distinct cue like `→` or a leading blank line. Default should remain pre-filled but **not** the GitHub `noreply` form: prefer leaving blank when git's `user.email` resolves to a `users.noreply.github.com` address, falling back to `user@localhost`.
- `cleargate-cli/test/lib/` — add a unit test asserting both helpers emit `question + ' '`, not `question + '\n'`.

**Out of scope:** the `--yes` non-interactive path (already correct), other CLI prompts (`promptEmailOTP` in `auth/identity-flow.ts` uses its own renderer — not part of this bug).

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx vitest run test/lib/prompts.test.ts`

The new test asserts:
- `promptYesNo("Q?", true, { stdout: capture })` writes exactly `"Q? "` (trailing space, no newline).
- `promptEmail("Q?", "default", { stdout: capture })` writes exactly `"Q? "`.

Manual smoke: in a fresh empty dir, run the rebuilt CLI and confirm the participant prompt sits on the same line as the cursor.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
