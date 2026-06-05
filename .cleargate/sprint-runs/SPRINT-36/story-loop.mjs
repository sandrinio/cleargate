export const meta = {
  name: 'cleargate-story-loop',
  description: 'One ClearGate story end-to-end: QA-Red -> TPV (wiring) -> Dev<->adversarial multi-lens verify (bounded rework) -> Architect post-flight. Returns a structured verdict; orchestrator handles branch/merge/state.',
  phases: [
    { title: 'QA-Red', detail: 'write failing acceptance tests (uncommitted)' },
    { title: 'TPV', detail: 'architect wiring-only validation' },
    { title: 'Dev', detail: 'implement; commit red+impl together' },
    { title: 'Verify', detail: 'parallel adversarial falsification lenses' },
    { title: 'Post-flight', detail: 'architect final review' },
  ],
}

let s = args
if (typeof s === 'string') {
  try { s = JSON.parse(s) } catch (e) { throw new Error('Workflow args is a non-JSON string: ' + String(s).slice(0, 200)) }
}
if (!s || typeof s !== 'object' || !s.storyId || !s.repoRoot) {
  throw new Error('Workflow args not populated (need storyId + repoRoot). Got type=' + (typeof args) + ' value=' + JSON.stringify(s).slice(0, 400))
}
log(`story-loop args OK: ${s.storyId} @ ${s.repoRoot} (branch ${s.branch})`)
const MAX_ATTEMPTS = 3

const STR = { type: 'string' }
const STRARR = { type: 'array', items: { type: 'string' } }
const RED_SCHEMA = { type: 'object', additionalProperties: false, required: ['status'], properties: {
  status: { enum: ['WRITTEN', 'BLOCKED'] }, redFiles: STRARR, baselineFail: { type: 'number' },
  blocker: STR, flashcards: STRARR } }
const TPV_SCHEMA = { type: 'object', additionalProperties: false, required: ['result'], properties: {
  result: { enum: ['APPROVED', 'BLOCKED-WIRING-GAP'] }, detail: STR, flashcards: STRARR } }
const DEV_SCHEMA = { type: 'object', additionalProperties: false, required: ['status'], properties: {
  status: { enum: ['done', 'blocked'] }, commit: STR, typecheck: { enum: ['pass', 'fail'] },
  tests: STR, filesChanged: STRARR, blocker: STR, blockerClass: { enum: ['test-pattern', 'spec-gap', 'environment', 'none'] },
  flashcards: STRARR } }
const LENS_SCHEMA = { type: 'object', additionalProperties: false, required: ['lens', 'verdict'], properties: {
  lens: STR, verdict: { enum: ['PASS', 'FAIL'] }, findings: STR, flashcards: STRARR } }
const POST_SCHEMA = { type: 'object', additionalProperties: false, required: ['result'], properties: {
  result: { enum: ['PASS', 'FAIL'] }, reasons: STR, redTestsUnmodified: { type: 'boolean' }, flashcards: STRARR } }

const ctx = `CROSS-REPO STORY — READ THESE FIRST, IN ORDER (absolute paths):
1. ${s.sprintContext}   (Sprint Goal + 8 Cross-Cutting Rules + Test Stack + THIS RUN's infra ports)
2. ${s.storyFile}       (the story: §3 Implementation Guide, §3.1 file surface, §4 acceptance Gherkin)

REPO: ${s.repoLabel} at ${s.repoRoot}   BRANCH: ${s.branch} (ALREADY created off ${s.baseBranch}; DO NOT create/switch/rebase branches — just \`git -C ${s.repoRoot}\` on the current branch).
Commands (run inside ${s.repoRoot}): typecheck=\`${s.typecheckCmd}\`  tests=\`${s.testCmd}\`  migrate=\`${s.migrateCmd}\`
Real infra is UP: Postgres 18 @ localhost:5433, Redis 8 @ localhost:6380 (mcp/.env already points here). ${s.freshDbNote || ''}
EPIC-027 boundary: touch ONLY ${s.repoLabel} files per the story surface; never cleargate-cli/src or .claude/.

SDR DISPATCH NOTES for ${s.storyId} (authoritative — override any stale story prose):
${s.sdrNotes}
${s.reuseContext ? '\nREUSE-FIRST (already merged this sprint — import, do not re-implement):\n' + s.reuseContext : ''}`

// ---- QA-Red -------------------------------------------------------------
phase('QA-Red')
const red = await agent(`role: QA-Red — Mode RED. ${ctx}

Write FAILING acceptance tests for THIS story's §4 Gherkin, as ${s.redGlobHint} files placed where the package test-glob picks them up (mcp globs src/**, scripts/**, test/** ; broker globs src/**, test/**). One scenario -> at least one assertion. Use node:test (tsx/esm). NO mocks of the DB/Redis — hit the real infra per the Test Stack.
You have NO implementation read access — write tests purely against the story's documented contract.
Tests MUST fail against the current clean baseline with "not-yet-implemented"-class errors (missing export/module/route/table), NOT syntax errors. Run \`${s.testCmd}\` to confirm they fail and capture the failing count.
DO NOT COMMIT and DO NOT modify any non-test file. Leave the red tests uncommitted in the working tree (Dev commits them together with the impl; immutability is enforced downstream — do not weaken them yourself).
Return: status WRITTEN|BLOCKED, the ABSOLUTE red file paths, baselineFail count, and any flashcards (surprises only).`,
  { agentType: 'qa', model: s.qaRedModel || 'sonnet', label: `qa-red:${s.storyId}`, phase: 'QA-Red', schema: RED_SCHEMA })

if (red.status !== 'WRITTEN') {
  return { storyId: s.storyId, verdict: 'BLOCKED', stage: 'qa-red', detail: red.blocker || 'QA-Red blocked', flashcards: red.flashcards || [] }
}
log(`QA-Red wrote ${(red.redFiles || []).length} red file(s), baseline ${red.baselineFail} failing`)

// ---- TPV (wiring only) --------------------------------------------------
phase('TPV')
const tpv = await agent(`role: Architect — Mode TPV (wiring only, NOT logic correctness). ${ctx}

QA-Red wrote these uncommitted red test files: ${(red.redFiles || []).join(', ')}.
Verify ONLY wiring so Dev does not waste a cycle on a mis-wired harness: (1) every import path resolves to a real file in ${s.repoRoot}; (2) constructor/function signatures referenced match the REAL code (e.g. buildServiceTokenAuth is 3-arg: jwt, db, redis); (3) any mocked/spied method actually exists on its object; (4) an after-hook tears down whatever a before-hook writes to Postgres/Redis (no cross-test state leak); (5) file naming = ${s.redGlobHint}. Do NOT critique assertions or test logic.
Return: result APPROVED, or BLOCKED-WIRING-GAP with ONE specific sentence (file:line + the fix).`,
  { agentType: 'architect', model: 'opus', label: `tpv:${s.storyId}`, phase: 'TPV', schema: TPV_SCHEMA })

if (tpv.result !== 'APPROVED') {
  return { storyId: s.storyId, verdict: 'BLOCKED', stage: 'tpv', detail: tpv.detail || 'TPV wiring gap',
    redFiles: red.redFiles, flashcards: [...(red.flashcards || []), ...(tpv.flashcards || [])] }
}

// ---- Dev <-> Verify bounded rework loop --------------------------------
let attempt = 0, dev = null, lensFindings = [], feedback = ''
while (true) {
  attempt++
  phase('Dev')
  dev = await agent(`role: Developer. ${ctx}
${attempt > 1 ? '\n*** REWORK attempt ' + attempt + ' *** — adversarial verify FALSIFIED the prior commit. Fix EXACTLY these, without weakening/skipping any red test:\n' + feedback + '\n' : ''}
Implement the story so the uncommitted red tests (${(red.redFiles || []).join(', ')}) all pass. Honor EVERY SDR note + Cross-Cutting Rule (indexed O(1) verify; fail-closed; bcrypt cost-12; additive migration named correctly; created_by column if specified).
HARD RULE: you MUST NOT edit, delete, rename, t.skip, or otherwise weaken any ${s.redGlobHint} file — they are frozen acceptance.
Sequence in ${s.repoRoot}: ${s.migrateCmd ? 'apply migrations (' + s.migrateCmd + ') to the fresh DB first; ' : ''}run \`${s.typecheckCmd}\` until clean; run \`${s.testCmd}\` until ALL green (red tests now pass + no regressions).
Then ONE commit on the current branch ${s.branch}: \`git -C ${s.repoRoot} add -A\` then commit with subject EXACTLY: "feat(${s.epic}): ${s.storyId} <short desc>". NEVER use --no-verify. (No pre-commit hook is installed in this repo, so YOU are the gate — do not commit red or failing tests.)
Write a brief report to ${s.reportsDir}/${s.storyId}-dev.md (what you built, files, key decisions, test result, any deviation from the story surface).
Return: status done|blocked (+ blockerClass if blocked), commit SHA, typecheck pass|fail, tests "<X passed, Y failed>", filesChanged, flashcards.`,
    { agentType: 'developer', model: s.devModel || 'sonnet', label: `dev:${s.storyId}#${attempt}`, phase: 'Dev', schema: DEV_SCHEMA })

  if (dev.status !== 'done') {
    return { storyId: s.storyId, verdict: 'BLOCKED', stage: 'dev', detail: dev.blocker || 'Dev self-blocked',
      blockerClass: dev.blockerClass || 'spec-gap', attempt, redFiles: red.redFiles,
      flashcards: [...(red.flashcards || []), ...(tpv.flashcards || []), ...(dev.flashcards || [])] }
  }

  phase('Verify')
  const lensResults = await parallel(s.verifyLenses.map((L) => () =>
    agent(`role: QA adversarial verifier — LENS "${L.key}". ${ctx}

The Developer committed ${dev.commit} on ${s.branch}. Your SOLE job: try HARD to FALSIFY that this story truly meets §4 acceptance, viewed through the lens of: ${L.focus}
Read the diff (\`git -C ${s.repoRoot} show ${dev.commit}\`) + the impl + the tests — static review is your PRIMARY tool; do not trust the Dev's claim. Probe specifically: did the Dev weaken/skip/delete any red test or make it vacuous? Is any §4 scenario uncovered? Does the claimed property hold under an adversarial input you construct? You MAY run the story's OWN test file(s) in ISOLATION (single-file run — adapt \`${s.testCmd}\` to target ONLY this story's *.node.test.ts paths) and use read-only DB inspection (psql / EXPLAIN ANALYZE). **Do NOT run the FULL suite (\`${s.testCmd}\` over all files): sibling lenses run CONCURRENTLY against the SAME shared database, and a full-suite run cross-contaminates them (manufactures FK 23503 flakes — this exact mistake forced a false ESCALATE on 047-01). The orchestrator owns the authoritative full-suite SERIAL gate.** Your job is falsification via static review + isolated checks.
Be a skeptic: default to FAIL if you find a real, reproducible hole; PASS only if you genuinely could not falsify within this lens.
Return: lens "${L.key}", verdict PASS|FAIL, findings (concrete file:line + reproduction for any FAIL), flashcards.`,
      { agentType: 'qa', model: s.verifyModel || 'opus', label: `verify:${L.key}:${s.storyId}#${attempt}`, phase: 'Verify', schema: LENS_SCHEMA })))

  lensFindings = lensResults.filter(Boolean)
  const fails = lensFindings.filter((v) => v.verdict === 'FAIL')
  if (fails.length === 0) { log(`Verify: all ${lensFindings.length} lenses PASS on attempt ${attempt}`); break }
  log(`Verify: ${fails.length} lens FAIL on attempt ${attempt} — ${fails.map((f) => f.lens).join(', ')}`)
  if (attempt >= MAX_ATTEMPTS) {
    return { storyId: s.storyId, verdict: 'ESCALATED', stage: 'verify', attempt, devCommit: dev.commit,
      lensFindings: fails, tests: dev.tests,
      flashcards: [...(red.flashcards || []), ...(dev.flashcards || []), ...lensFindings.flatMap((v) => v.flashcards || [])] }
  }
  feedback = fails.map((f) => `[lens ${f.lens}] ${f.findings}`).join('\n')
}

// ---- Architect post-flight ---------------------------------------------
phase('Post-flight')
const post = await agent(`role: Architect — post-flight. ${ctx}

Dev committed ${dev.commit}; all ${s.verifyLenses.length} adversarial lenses PASS. Final gate:
(1) red tests are byte-unchanged vs what QA-Red wrote — verify Dev only ADDED impl, didn't weaken acceptance (inspect \`git -C ${s.repoRoot} show ${dev.commit}\` for any edit to ${s.redGlobHint} files; set redTestsUnmodified).
(2) file surface matches §3.1 (+ the SDR-approved additions like admin-api/index.ts registration / created_by); flag off-surface edits.
(3) no new runtime dependency beyond those the SDR approved.
(4) every Cross-Cutting Rule honored (mcp=authority/broker-verifies; indexed verify; fail-closed; additive migration; Redis key shape).
(5) boundary: nothing under cleargate-cli/src or .claude/; no PM-tool SDK.
Write a brief report to ${s.reportsDir}/${s.storyId}-arch.md. Return: result PASS|FAIL, reasons, redTestsUnmodified, flashcards.`,
  { agentType: 'architect', model: 'opus', label: `postflight:${s.storyId}`, phase: 'Post-flight', schema: POST_SCHEMA })

const flashcards = [
  ...(red.flashcards || []), ...(tpv.flashcards || []), ...(dev.flashcards || []),
  ...lensFindings.flatMap((v) => v.flashcards || []), ...(post.flashcards || []),
]
return {
  storyId: s.storyId,
  verdict: (post.result === 'PASS' && post.redTestsUnmodified !== false) ? 'GREEN' : 'NEEDS_WORK',
  devCommit: dev.commit, tests: dev.tests, filesChanged: dev.filesChanged, redFiles: red.redFiles,
  attempts: attempt, lensFindings, postflight: post, flashcards,
}
