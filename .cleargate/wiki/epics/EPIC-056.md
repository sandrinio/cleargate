---
type: epic
id: "EPIC-056"
parent: ""
children: []
cites: 
  - "[[CR-107]]"
  - "[[CR-126]]"
  - "[[EPIC-028]]"
  - "[[EPIC-055]]"
  - "[[EPIC-061]]"
  - "[[STORY-061-03]]"
cited_by: 
  - "[[CR-110]]"
  - "[[CR-111]]"
  - "[[CR-126]]"
  - "[[EPIC-061]]"
  - "[[STORY-061-01]]"
  - "[[STORY-061-02]]"
  - "[[STORY-061-03]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-056_CI_Verification_Layer.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "d3ca3bef420c543e8cc459e9333b736e15a556ba"
repo: "planning"
---

# EPIC-056: CI verification layer — environment-independent proof that tests pass

**Status:** Draft · **Sprint:** none · **Gate:** fail: interrogation-resolved

## Objective
Add GitHub Actions workflows to cleargate-cli, cleargate-mcp and cleargate-admin that run typecheck plus the full test suite on push and pull_request, and wire them as required status checks.

## Problem & Value
**Why are we doing this?**

There is no CI in any ClearGate repo — `ls .github/workflows` returns nothing for the meta repo, `cleargate-cli`, and `mcp`. Today "the tests pass" is established entirely inside the five-agent loop: the Developer runs them, then QA independently re-runs them (`qa.md:130`, `:165` — *"Never approve on Developer's word. Re-run everything yourself."*).

[+1,086 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-056_CI_Verification_Layer.md]

## Scope
**In:**
- [x] `ci.yml` for `cleargate-cli`: typecheck + full `node:test` suite. *(Delivered 2026-11-07 by [[STORY-061-03]] under [[EPIC-061]] S7, cli merge `5cbad8d`. It also runs `verify-pack` and a digest-pinned gitleaks scan.
**Out:**
- Story→sprint pull requests. That is [[CR-107]]'s deferred half and a separate decision once this lands.
- Deployment. Coolify watches `main` for mcp and admin; `npm publish` stays a manual release step.
- Replacing or restructuring the five-agent loop.

[+658 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-056_CI_Verification_Layer.md]

## Architecture rules
- Must use node:test via tsx — the single-runner rule (EPIC-028). Do NOT reintroduce vitest
- Must run database tests against real infra (docker-compose Postgres 18 + Redis 8) — the no-mocks rule
- admin/ tests require the `node --conditions browser` flag for jsdom-bootstrap
- No changes to the five-agent loop — CI supplements QA, it does not replace it
- No deployment steps — Coolify owns deploy for mcp and admin; npm publish stays manual

## Open questions
- "Two decisions I can't make from the code. (a) Should CI run the full suite on every push to every branch, or only on `main` + `pull_request`? Full-on-every-push is the strongest signal but three repos × every push is real Actions spend. (b) Should the meta repo get a workflow too — it holds no TypeScript but does hold ~20 shell tests under `.cleargate/scripts/test/` that nothing currently runs automatically?"

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (6): [[CR-107]], [[CR-126]], [[EPIC-028]], [[EPIC-055]], [[EPIC-061]], [[STORY-061-03]]
- Cited by (7): [[CR-110]], [[CR-111]], [[CR-126]], [[EPIC-061]], [[STORY-061-01]], [[STORY-061-02]], [[STORY-061-03]]
<!-- END relations -->
