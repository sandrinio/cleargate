---
story_id: STORY-003-12
parent_epic_ref: EPIC-003
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:55.296Z
push_version: 2
---

# STORY-003-12: Dockerfile + Coolify Deploy Runbook

**Complexity:** L2.

## 1. The Spec
Verify the scaffolded Dockerfile builds cleanly, image size is reasonable (< 250 MB), and the app boots inside a container against external Postgres + Redis. Write `mcp/coolify/DEPLOYMENT.md` step-by-step.

### Detailed Requirements
- Multi-stage build succeeds on local and in Coolify's builder
- Container respects non-root user
- Health check at `/health` responds 200 within 3s of container start
- Runbook covers: env vars, Postgres + Redis services on Coolify, domain + TLS, first-admin bootstrap

## 2. Acceptance
```gherkin
Scenario: Local docker build
  When I run `docker build -t cleargate-mcp ./mcp`
  Then build succeeds
  And image size < 250 MB

Scenario: Container starts and passes health check
  Given a docker run with valid DATABASE_URL and REDIS_URL env vars
  When I curl http://localhost:3000/health
  Then status 200 within 3s
```

## 3. Implementation
- `mcp/Dockerfile` — verify (already scaffolded)
- `mcp/coolify/DEPLOYMENT.md` — new

## 4. Quality Gates
- Manual: deploy to a throwaway Coolify project; document each click

## Ambiguity Gate
🟢.
