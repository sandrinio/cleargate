# DevOps Report — BUG-067

Two-repo item (outer meta-repo + `cleargate-cli`), standard lane. Canonical scaffold NOT touched (`stamp-and-gate.sh` and `prep_doc_refresh.mjs` intentionally unchanged by this fix).

## Merge Result

- Outer: `sprint/S-41` ← `story/BUG-067` — merge commit **`e031682b`** — "merge(story/BUG-067): locate the frontmatter fence instead of requiring offset 0". One conflict in `.cleargate/wiki/log.md` (both sides appended at EOF). Resolved by ordering all three entries by timestamp: SPRINT-41 (03:49:06.645Z) → BUG-067 (04:37:50.867Z) → BUG-085 (04:41:45.123Z), matching the Architect's predicted order. Pre-commit hooks (surface gate, no-vitest checks) passed.
- CLI: `main` ← `story/BUG-067` — merge commit **`8931b91`** — same message. No conflicts (`ort` strategy; `git merge-tree` had been verified clean by the Architect ahead of time — confirmed in practice). Prior `main` head: `515dd3e` (BUG-085 M0 hook-test fix, landed after `story/BUG-067` was cut; no interaction). 12 files changed, 1726 insertions(+), 90 deletions(-) — new `src/lib/frontmatter-locator.ts`, fixture, and three new red-turned-green test files.

## Post-Merge Tests

- Command: `cd cleargate-cli && npm test` (plain, not through `run_script.sh`).
- Result: **2741 tests, 2739 pass, 0 fail, 2 skipped** (skips dropped from 3→2: N6b reactivated by this fix, as flagged in the dispatch). Pass criterion (0 failures) met; the +~41 test / skip-count shift is expected and was not judged against a fixed count.
- Duration: ~221.1s (~3m41s).
- Exit code: 0.

## Dist Rebuild (boundary BD) + Live-Fix Proof

- `cd cleargate-cli && npm run build` — succeeded.
- Dist built from cli `main` at **`8931b91`** (confirmed via `git -C cleargate-cli rev-parse --short HEAD`).
- Signal check: `node cleargate-cli/dist/cli.js hook signal block --host claude` → exit **2** ✓
- Live-fix proof: wrote a fixture at a scratch path with an `<instructions>` block followed by a frontmatter fence *not* at offset 0 (`bug_id: "BUG-999"`, `status: "Draft"`) and a `# Body` section, then ran `node cleargate-cli/dist/cli.js stamp <file>`. Result (exit 0, `[stamped] ... (created)`):
  - `bug_id` survives in the frontmatter (re-serialized as `bug_id: BUG-999` — YAML normalizes the quoting on stamp-rewrite, value unchanged).
  - Only one frontmatter block exists: `grep -c '^---$'` → 2 (one open/close pair), and no `---` fence appears before `<instructions>` in the file (grep count 0 in the pre-`<instructions>` region) — confirms the historical bug (a second frontmatter block prepended at offset 0) does not recur.
  - The `<instructions>` block is byte-identical before vs. after stamping (`diff` on the extracted block, exit 0).
  - `cleargate-planning/MANIFEST.json` content was unaffected by the build beyond the routine `generated_at` timestamp bump (reverted, see Rule-14 Cleanup) — consistent with "canonical scaffold not touched."

## Rule-14 Cleanup

Full-suite run wrote the usual `.cleargate/delivery/**` back-sync noise and a `generated_at` timestamp bump into `cleargate-planning/MANIFEST.json` in the outer main checkout. Verified via `git diff` that the MANIFEST diff was timestamp-only (no content change, consistent with "canonical scaffold touched: no") before reverting with `git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`. Only `.cleargate/sprint-runs/SPRINT-41/.session-totals.json` and `token-ledger.jsonl` (hook-written ledger files) remain modified, committed with this report.

## Mirror Parity Audit

- `.cleargate/scripts/prep_doc_refresh.mjs` vs `cleargate-planning/.cleargate/scripts/prep_doc_refresh.mjs` — `cmp` exit 0, **identical, clean**.
- `stamp-and-gate.sh` hash comparison:
  - Canonical (`cleargate-planning/.claude/hooks/stamp-and-gate.sh`): `63f9213137a51282c2c88bf3959ab5c44db0a588bfad99bc02766da4d42f2b87`
  - CLI payload template (`cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh`): `63f9213137a51282c2c88bf3959ab5c44db0a588bfad99bc02766da4d42f2b87` — **matches canonical exactly**.
  - Live (`.claude/hooks/stamp-and-gate.sh`): `9c6beeda6d1a0db19b1c6e21de8f20b9845317d40f32d7f4d390025d652a5462` — differs, but `diff` shows the difference is **only** the version-pin substitution (`# cleargate-pin: __CLEARGATE_VERSION__` → `0.20.0`, and the matching `npx -y "cleargate@..."` line) — expected, no drift beyond the pin.

No auto-fix applied to any live file.

## State Transition

- Story state: `Done` (confirmed via `.cleargate/sprint-runs/SPRINT-41/state.json` → `stories.BUG-067.state === "Done"`, `updated_at: 2026-09-25T05:27:12.336Z`).
- Transitioned at: 2026-09-25T05:27:12.336Z (via `CLEARGATE_STATE_FILE=... bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs BUG-067 Done`).

## Cleanup

- Worktree `.worktrees/BUG-067`: removed (confirmed absent from `git worktree list`).
- Branch `story/BUG-067` (outer): deleted.
- Branch `story/BUG-067` (cli): deleted.
- CLI checkout left on `main` at `8931b91`.
