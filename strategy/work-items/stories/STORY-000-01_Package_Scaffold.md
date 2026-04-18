---
story_id: "STORY-000-01"
parent_epic_ref: "EPIC-000"
status: "Completed"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-001_Document_Metadata.md"
sprint_id: "SPRINT-03"
shipped_commit: "3bcfcd4"
completed_at: "2026-04-17T22:00:00Z"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-000-01: Package Scaffold — `package.json`, `tsconfig`, `tsup`

**Complexity:** L1 — single-area scaffold.

## 1. The Spec
Create the minimum viable npm package at `cleargate-cli/`: `package.json` with name `@cleargate/cli`, `bin` entry `cleargate → dist/cli.js`, scripts for build/dev/typecheck. Strict TypeScript config. `tsup.config.ts` building to `dist/` as ESM + CJS with shebang.

### Out of Scope
CLI command code (STORY-000-02 onward).

## 2. Acceptance
```gherkin
Scenario: Build produces a runnable binary
  When I run `npm install && npm run build`
  Then dist/cli.js exists with shebang "#!/usr/bin/env node"
  And node dist/cli.js --version prints the package.json version
```

## 3. Implementation
- `cleargate-cli/package.json` — name, bin, scripts, deps (commander, zod), devDeps (tsup, typescript)
- `cleargate-cli/tsconfig.json` — strict, ES2022
- `cleargate-cli/tsup.config.ts` — entry `src/cli.ts`, formats ESM+CJS, shims node banner

## 4. Quality Gates
- Unit: none (config files)
- Manual: `npm run build` succeeds, `node dist/cli.js --version` works

## Ambiguity Gate
🟢 — inherits EPIC-000 decisions (tsup, Commander, @cleargate/cli name).
