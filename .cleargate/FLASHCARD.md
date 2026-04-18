# ClearGate Flashcards

One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
Format: `YYYY-MM-DD · #tags · lesson`

---

2026-04-19 · #hooks #protocol · Claude Code hooks schema: PostToolUse uses nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"`; no `pathPattern` field and no `$CLAUDE_TOOL_FILE_PATH` env — file path is on stdin at `.tool_input.file_path`.
2026-04-18 · #cli #url-parsing #join · `cleargate join` UUID-first-check pattern: test UUID_V4_RE before `new URL()` — bare UUID triggers `new URL()` ERR_INVALID_URL; full-URL base is url.origin not config (but don't persist it).
2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.
2026-04-18 · #schema #migrations · drizzle-kit manual SQL files are ignored by `db:migrate`; always run `db:generate` to register migration in meta/_journal.json before applying.
2026-04-18 · #cli #commander #optional-key · Passing `optionalProp: undefined` in an object literal keeps the key present (`'key' in obj === true`); conditionally assign to omit the key entirely when wire body must not contain it.
2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.
2026-04-18 · #cli #plaintext-redact · Plaintext secrets (refresh/invite/api tokens) must never be spread into log objects; reach into the response with named field access and write only the bare string to stdout. redactSensitive covers debug paths.
2026-04-18 · #zod #drift-detection · When vendoring response schemas in a CLI from a server's hand-authored OpenAPI snapshot, add a snapshot-drift unit test that reads the snapshot file at runtime and asserts schema field-set equality. Vitest snapshot files use JS syntax with trailing commas — strip before JSON.parse.
2026-04-18 · #admin-jwt #file-shape · Admin JWT file ~/.cleargate/admin-auth.json is a single-token shape {version,token}, NOT a profile-map TokenStore — distinct security/UX domains.
2026-04-18 · #fastify #ctp-empty-body · Fastify 5 throws FST_ERR_CTP_EMPTY_JSON_BODY when Content-Type: application/json is set with empty body; HTTP clients must omit the header on no-body requests (DELETE).
2026-04-18 · #monorepo #npm-workspaces · Adopt npm workspaces only when first cross-package import lands; root-package.json adoption forces sibling reinstall and may break working test suites — verify with npm test --workspace=<pkg> immediately after npm install.
2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.
2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.
2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every write for security-sensitive files.
2026-04-18 · #tsup #cjs #esm · Top-level await breaks CJS emit in tsup/esbuild; use `void program.parseAsync()` instead.

