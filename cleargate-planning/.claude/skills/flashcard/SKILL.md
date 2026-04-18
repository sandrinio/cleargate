---
name: flashcard
description: Append-only project lesson log at .cleargate/FLASHCARD.md. Use BEFORE starting non-trivial work to read past gotchas ("check" mode). Use WHEN you hit a surprise, wasted time, or a non-obvious gotcha to record it for future agents ("record: <one-liner>" mode). One-liners only; tag with #schema/#auth/#test-harness/etc. Also triggers on phrases like "turns out", "unexpected", "gotcha", "wasted time on", "starting work on", "before implementing".
---

# Flashcard — Project Lesson Log

Append-only one-liner log of non-obvious gotchas that future agents in this project should know. Lives at `.cleargate/FLASHCARD.md` in the project root. Not a general wiki — only things that surprised us and would surprise someone else.

## Two modes

### `check` — read before work
Read `.cleargate/FLASHCARD.md`. Scan for tags relevant to your current task (grep by `#schema`, `#auth`, etc.). If a card applies, follow its guidance. If unsure whether a card applies, err on applying it — reading 20 one-liners is cheap.

### `record: <one-liner>` — write after surprise
Append a single line to `.cleargate/FLASHCARD.md`. Format:

```
YYYY-MM-DD · #tag1 #tag2 · <lesson ≤ 120 chars>
```

Example:
```
2026-04-18 · #redis #auth · Invite tokens in Redis-only vanish on eviction — use Postgres invites table as source of truth.
```

### Tag vocabulary (append new tags freely, but prefer these)
- `#schema` — Drizzle / migration / Postgres table shape gotcha
- `#auth` — JWT / refresh / bcrypt / token handling
- `#keychain` — macOS Keychain / libsecret / `@napi-rs/keyring` / `keytar`
- `#redis` — Redis key shape, TTL, persistence
- `#test-harness` — local docker compose, Postgres 18, Redis 8, flaky tests
- `#ci` — pipeline / GitHub Actions / pre-commit hooks
- `#mcp` — MCP SDK / Streamable HTTP / session protocol
- `#cli` — Commander / tsup / bin entry / npm publish
- `#admin-api` — Admin API contract / OpenAPI snapshot / zod
- `#ui` — SvelteKit / Tailwind / DaisyUI
- `#reporting` — sprint report generation
- `#qa` — recurring QA kickback patterns
- `#ambiguity` — story-spec ambiguities that bit us

## Rules

1. **Grep before append.** `grep -iF "<key phrase>" .cleargate/FLASHCARD.md` — if a matching card exists, skip or edit the existing line with a date suffix (e.g. `… (reconfirmed 2026-05-10)`). Never duplicate.
2. **One line per card.** Hard cap 120 characters for the lesson body. If it needs more, you are writing docs, not a flashcard — put docs elsewhere.
3. **Lead with the surprise, not the context.** Good: "Drizzle 0.45 silently drops `DEFAULT gen_random_uuid()` — use `sql` template." Bad: "When working on schema migrations yesterday we found that sometimes…"
4. **Lessons, not events.** "Shipped STORY-004-07 today" is NOT a flashcard. "Postgres 18 needs `pgcrypto` extension for gen_random_uuid — not enabled by default in official docker image" IS.
5. **Ordered newest-first after the header** — new entries go at the TOP of the log section, not bottom. Readers scan the top; old stuff drifts down.
6. **Never delete.** Edit to add reconfirmations or deprecation notes; keep the original text. History is the point.

## Invocation contract

When an agent invokes this skill:

- **`Skill(flashcard, "check")`** — open `.cleargate/FLASHCARD.md`, summarize any cards with tags relevant to the current task context in one line per card. If none apply, respond "no relevant flashcards" and proceed.
- **`Skill(flashcard, "record: <text>")`** — parse the text for date + tags + body. If date missing, insert today's UTC date. If tags missing, refuse with "add at least one tag." Grep for duplicates; if dup, reconfirm the existing line instead of appending. Append to the top of the log section in the file.

## File shape

`.cleargate/FLASHCARD.md` layout:

```markdown
# ClearGate Flashcards

One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
Format: `YYYY-MM-DD · #tags · lesson`

---

2026-04-18 · #redis #auth · <newest lesson>
2026-04-17 · #schema · <older lesson>
...
```
