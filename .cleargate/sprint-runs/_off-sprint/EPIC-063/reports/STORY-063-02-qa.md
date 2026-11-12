# STORY-063-02 QA-Verify (role: qa)

QA: PASS

- Typecheck: `npm run typecheck` exit 0.
- Tests (3 red files + stamp-and-gate.node + init.node): 93 pass / 0 fail / 0 skip. Full suite not re-run (per instruction; Dev reported 3996/0/2).
- `node scripts/build-codex-payload.mjs --check` rc=0; claude and codex stamp-and-gate.sh are byte-identical at 23e4582 (generated, not hand-edited).
- Test diff 52d5518..23e4582 is exactly one file: test/snapshots/hooks/stamp-and-gate.story-063-02.sh (130 lines). Legit fixture: the QA-Red init.node.test.ts (STORY-063-02 snapshot test, :849) asserts it exists and byte-equals the rendered hook. No red test weakened.
- Gherkin map:
  - Outline rows 1-3 (contradiction directive / ingested / gate failed) PASS (stamp-and-gate-context.red.integration)
  - Codex plain lines PASS
  - emit-context round-trip (quotes/backslash/tab) and empty-input PASS (emit-context.red + manual spot check)
  - Docs/rules scenario PASS (ingest-docs-match-code.red)
  - Ingest-failure visible, exit 0 PASS
- Spot check via `npx tsx src/cli.ts hook emit-context`: Claude PostToolUse gives `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"a \"q\" \\ b\tc\nline2"}}`; empty stdin prints 0 bytes; codex plain; unknown host rc=2 with stderr. Hook runs the CLI with `|| true` and ends `exit 0`, so exit code is unchanged.
- R1-R4: R1 formatHookContext + hidden emit-context (JSON.stringify, never bash); R2 hook collects to a temp file, one emit at end, log writes kept; R3 CLAUDE.md + AGENTS.md Brief rule with `Contradictions:` line, conversational-style line updated; R4 protocol §10.8 (lint at sprint close/on demand), §10.9 (four-level chain), §10.10 (Mode A as built, content hash, approved filter, replaces EPIC-020 rule), agent description drops "Auto-invoked", lists epics|sprints|proposals|crs|bugs|initiatives|spikes, step 4d names contradict-commit only.
- Carry-forwards: contradict.ts stale "Git SHA" comments (3) and wiki-contradict.ts:51 fixed (grep "Git SHA" empty); collect.ts header (A2) updated; G13 Codex `Bash` matcher + PostToolUse unverified stated in §10.9; G15 §10.9/§10.8 old claims rewritten.
- Minor (non-blocking): agent doc still lists the `stories` bucket derivation (:34/:41) with the config.yml allowlist explanation; the "no stories by default" fact is carried by the allowlist text, not stated outright. Task Breakdown rows unchecked in story file (advisory). Live re-sync/doctor and real-session verification are DoD manual steps outside this gate.

Flashcards:
- 2026-11-12 · #qa #test-harness · A Dev-added snapshot is legit when a red test already asserts its path+bytes; check the red test, not the fixture.
