---
story_id: "STORY-006-10"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-006-10: Admin Dockerfile + Coolify Deploy Runbook

**Complexity:** L2.

## 1. The Spec
Multi-stage Dockerfile building SvelteKit with `adapter-node`. `admin/coolify/DEPLOYMENT.md` runbook: env vars (GitHub OAuth creds, MCP URL, Redis URL, session secret), domain + TLS, health check.

## 2. Acceptance
```gherkin
Scenario: Container boots
  When docker run admin image with all env vars
  Then GET / (unauthenticated) redirects to /login within 2s

Scenario: Coolify deploy follows runbook
  Given a new Coolify project per DEPLOYMENT.md
  Then the app is reachable at admin.cleargate.<domain> over HTTPS
```

## 3. Implementation
- `admin/Dockerfile`
- `admin/coolify/DEPLOYMENT.md`

## Ambiguity Gate
🟢.
