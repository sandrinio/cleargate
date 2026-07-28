---
work_item: CR-087
sprint: SPRINT-38
wave: 7
agent: qa
modes: [red, verify]
verdict: PASS
acceptance_coverage: 5 of 5
transcribed_by: orchestrator
red_commit: 51521f7
---

# CR-087 — QA report

## QA-Red
`QA-RED: WRITTEN` (`51521f7`) — new sibling suite
`cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts` (504 lines) per ruling W7-A3;
CR-086's suite left byte-identical as the must-not-weaken control.
**10 of 12 legs red.** Load-bearing leg 1a: downstream-shaped repo, hook wired the documented way,
plain `git commit` → status 1, **0 bytes stdout, 0 bytes stderr** — the defect, captured verbatim.
Legs 3a/3c/5b were green on status but red on text (the residue message is erased by `2>/dev/null`),
which is the stronger assertion. Legs 3b and 5a are genuinely-green regression guards.

## QA-Verify — `QA: PASS`, 5 of 5, no regressions
Independently re-ran all 12 legs green, plus CR-086's 21 untouched, plus the assume-ack suite 20/20
with no override (confirming the Developer's 2 reported failures are the documented cross-repo path
artifact, not a regression).

Attacked the disarm risk two ways rather than trusting the Developer's word:
1. Ran the fixed hook against the real outer checkout — all three real `check:no-vitest` scripts
   executed with visible npm output, exit 0, **not skipped**.
2. Built an independent scratch fixture (not reusing the Developer's or QA-Red's code) seeding a
   genuinely-failing `cleargate-cli/package.json` with real vitest-residue text alongside passing
   `mcp`/`admin` — commit blocked at exit 1, HEAD did not advance, stderr carried both the named
   `[surface-gate] BLOCKED:` line and the residue text.

Portability: no bash-4-isms (`declare -A`, `mapfile`, `readarray`, `${var,,}`); no `jq` dependency;
committed loop body byte-identical to the plan's prescribed block; constructed an npm-absent-from-PATH
fixture and confirmed the named WARNING + exit 0 path.

`META_REPO_STILL_ENFORCES: yes` · `DOGFOOD_PARITY: ok` (canonical == live-root twin for
`cleargate-enforcement.md`; the hook is canonical-only this wave per W7-A1) · `STRAY_MUTATIONS: none`.
