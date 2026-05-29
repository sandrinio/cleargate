---
story_id: "STORY-072-01"
sprint_id: "SPRINT-30"
agent: "developer"
commit: "9e379f75"
branch: "story/STORY-072-01"
generated_at: "2026-05-19T00:00:00Z"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-072-01 Dev Report

## Summary

Expanded the default `cleargate init` gitignore template from 15 lines (ClearGate blocks only) to ~50 lines across 7 sections: Secrets, OS junk, Python, Node.js, ClearGate per-participant, ClearGate worktrees, ClearGate telemetry.

## Canonical Source Location

`cleargate-planning/.gitignore` is the canonical source. The `copy-planning-payload.mjs` script copies FROM `cleargate-planning/` TO `cleargate-cli/templates/cleargate-planning/`. `npm run prebuild` was run to mirror. The `cleargate-cli/templates/cleargate-planning/` directory is gitignored (runtime-generated artifact).

## Three-Site Mirror Status

- Canonical: `cleargate-planning/.gitignore` — EDITED
- npm payload: `cleargate-cli/templates/cleargate-planning/.gitignore` — MIRRORED via `npm run prebuild` (byte-identical confirmed via `diff`)
- Live `/.claude/`: N/A — `.gitignore` is not part of the `.claude/` tree

## Key Decision: git check-ignore -v vs without -v

The QA-Red test used `git check-ignore -v` for the `.env.example` NOT-ignored assertion. With `-v`, git exits 0 when it finds ANY matching rule — including negation `!` rules — which gives a false positive. Without `-v`, it correctly exits 1 for files that are ultimately not ignored. Fixed in the plain test file.

## Files Changed

- `cleargate-planning/.gitignore` — canonical template rewritten
- `cleargate-planning/MANIFEST.json` — updated by prebuild
- `cleargate-cli/test/commands/init-gitignore-expansion.node.test.ts` — 5 test scenarios (renamed from .red.)
- `cleargate-cli/test/commands/init-gitignore-expansion.red.node.test.ts` — DELETED

## Test Results

5/5 gitignore expansion scenarios pass. Pre-existing wiki test failures (build, contradict-cli, ingest, lint-index-budget) exist on main and are unrelated to this story.
