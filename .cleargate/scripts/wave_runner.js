export const meta = { name: 'cleargate-wave-runner', description: 'Runs one ClearGate wave exactly as waves.json and the stage table describe it. Args come from wave_runner_args.mjs; the merge runs at the barrier.', phases: [{ title: 'Plan' }, { title: 'QA-Red' }, { title: 'Wiring' }, { title: 'Build' }, { title: 'Verify' }, { title: 'Post-flight' }] }

// wave_runner.js (STORY-066-11). A Workflow script: Workflow globals only (agent, parallel, log, args).
// It runs no shell and reads no file. Which stages run for an item comes from item.stages (built
// from the stage table by wave_runner_args.mjs); this file holds presentation and routing only.
const A = typeof args === 'string' ? JSON.parse(args) : args

const FC = { type: 'array', items: { type: 'string' } }
const schema = (props, first) => ({ type: 'object', properties: Object.assign({}, props, { flashcards_flagged: FC }), required: [first] })
const CHECK = schema({ result: { type: 'string', enum: ['APPROVED', 'BLOCKED-WIRING-GAP', 'PASS', 'FAIL'] }, issue: { type: 'string' } }, 'result')

// Adapters, keyed by stage name. role drives routing; the field names mirror seal_red.mjs
// (sealed_sha, scan_exit, flags) and the QA-Verify output (DEFECT_IN: none | code | red-test | spec).
const ADAPTERS = {
  'story-plan': { phase: 'Plan', label: 'Architect', role: 'plan', schema: schema({ ok: { type: 'boolean' }, path: { type: 'string' } }, 'ok') },
  'qa-red': {
    phase: 'QA-Red', label: 'QA-Red', role: 'red',
    schema: schema({
      status: { type: 'string', enum: ['WRITTEN', 'BLOCKED'] }, sealed_sha: { type: 'string' }, scan_exit: { type: 'number' },
      flags: { type: 'array', items: { type: 'string' } }, tests: { type: 'array', items: { type: 'string' } },
      scenarios: { type: 'number' }, spec_gap: { type: 'string' },
    }, 'status'),
  },
  'architect-tpv': { phase: 'Wiring', label: 'Architect', role: 'red-check', schema: CHECK },
  developer: {
    phase: 'Build', label: 'Developer', role: 'build',
    schema: schema({
      status: { type: 'string', enum: ['done', 'blocked'] }, commit: { type: 'string' },
      blocker_section: { type: 'string', enum: ['none', 'Test-Pattern', 'Spec-Gap', 'Environment', 'Red-Test'] }, notes: { type: 'string' },
    }, 'status'),
  },
  'qa-verify': {
    phase: 'Verify', label: 'QA-Verify', role: 'verify',
    schema: schema({
      result: { type: 'string', enum: ['PASS', 'PASS-PENDING-SMOKE', 'FAIL'] },
      defect_in: { type: 'string', enum: ['none', 'code', 'red-test', 'spec'] },
      defects: { type: 'array', items: { type: 'string' } }, commands_run: { type: 'array', items: { type: 'string' } },
      proof: { type: 'string', enum: ['pass', 'fail', 'n/a'] },
    }, 'result'),
  },
  'architect-review': { phase: 'Post-flight', label: 'Architect', role: 'build-check', schema: CHECK },
}

const TIER_UP = { haiku: 'sonnet', sonnet: 'opus', opus: 'opus' }
const tierUp = (m) => TIER_UP[m] || m

// scan-flagged: no seal result, a non-zero scan exit (2 included), or any flag.
const scanFlagged = (red) => !red || red.scan_exit !== 0 || (Array.isArray(red.flags) && red.flags.length > 0)
const defectIn = (v) => (v && (v.defect_in === 'code' || v.defect_in === 'red-test' || v.defect_in === 'spec') ? v.defect_in : 'code')

const text = (v) => (Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v))

function promptFor(item, stage, ad, label, st) {
  const id = item.id
  const hasPlan = item.stages.some((s) => (ADAPTERS[s.name] || {}).role === 'plan')
  const file = item.file ? item.file : 'find ' + id + '_*.md under .cleargate/delivery/'
  const lines = [
    label,
    'Sprint ' + A.sprintId + '. Item ' + id + ' (lane ' + item.lane + '). Item file: ' + file + '. Worktree: .worktrees/' + id + ' (branch story/' + id + ', base ' + item.base + '). Read .cleargate/sprint-runs/' + A.sprintId + '/sprint-context.md first.',
  ]
  if (stage.mode) lines.push('Mode: ' + stage.mode)
  if (ad.role === 'plan') lines.push('Write .cleargate/sprint-runs/' + A.sprintId + '/plans/' + id + '.md, at most 150 lines. Return ok and path.')
  if (ad.role === 'red') {
    if (hasPlan) lines.push('Plan: .cleargate/sprint-runs/' + A.sprintId + '/plans/' + id + '.md. Read it before writing tests. Call the functions and types it names with the signatures it gives; never declare a symbol with one of those names in a test file; give test helpers names that cannot collide with production code.')
    lines.push('Write the failing tests for the item. Last step, per qa.md Mode: RED: node .cleargate/scripts/seal_red.mjs ' + id + ' --worktree .worktrees/' + id + ' --sprint-branch ' + item.base + ' -- <test files>. Return its JSON fields (sealed_sha, scan_exit, flags, tests, scenarios) plus status WRITTEN, also when the seal is flagged: the runner sends a flagged seal to Architect TPV. Return status BLOCKED with spec_gap only when a scenario cannot be expressed as a test or the seal could not run.')
  }
  if (ad.role === 'build') {
    lines.push(hasPlan ? 'Plan: .cleargate/sprint-runs/' + A.sprintId + '/plans/' + id + '.md.' : 'Plan: the sprint plan section 2 and the waves.json contracts.')
    lines.push('Implement the item in its worktree and commit once. Return status, commit and blocker_section.')
  }
  if (ad.role === 'verify') lines.push('First step: node .cleargate/scripts/prep_qa_context.mjs ' + id + ' .worktrees/' + id + ' (writes .cleargate/sprint-runs/' + A.sprintId + '/.qa-context-' + id + '.md), then read that pack.')
  if (ad.role === 'verify') lines.push('Run the item and report result, defect_in (none | code | red-test | spec), defects, commands_run and proof.')
  if (st.issue) lines.push('Rework input: ' + st.issue)
  if (ad.role === 'red-check') lines.push('Scan input: .cleargate/sprint-runs/' + A.sprintId + '/reports/' + id + '-pre-arch-scan.txt and the seal flags: ' + text(st.lastRed && st.lastRed.flags) + '. Return result and issue.')
  if (ad.role === 'build-check') lines.push('Review the built item against its plan and the seal scan. Return result and issue.')
  return lines.join('\n')
}

async function segment(item) {
  const id = item.id
  const stages = item.stages
  const models = item.models || {}
  const st = { cycle: 0, qaBounces: 0, archBounces: 0, run: [], defectsIn: [], flash: [], devSha: item.devSha || null, qaSha: item.qaSha || null, lastRed: null, issue: item.issue ? String(item.issue) : '', passes: {}, noneFails: 0 }
  const hasRed = stages.some((s) => (ADAPTERS[s.name] || {}).role === 'red')
  const idxOf = (role) => stages.findIndex((s) => (ADAPTERS[s.name] || {}).role === role)

  const finish = (verdict, blocker) => {
    const green = verdict === 'GREEN'
    const v = {
      verdict, storyId: id, runId: A.runIds && A.runIds[id] ? A.runIds[id] : item.runId,
      devSha: st.devSha, qaSha: st.qaSha, flashcards_flagged: st.flash,
      counters: { qa_bounces: st.qaBounces, arch_bounces: st.archBounces, breaker_hits: 0 },
      tokens: { metering: 'unavailable' }, lane: item.lane, stages_run: st.run, defects_in: st.defectsIn,
    }
    if (!green) { v.devSha = v.devSha || null; v.qaSha = v.qaSha || null; v.blocker = blocker }
    return v
  }
  const blocked = (type, message) => finish('BLOCKED', { type, message: id + ': ' + message })
  const escalate = (what) => finish('ESCALATED', { type: 'technical-impossibility', message: id + ': bounce cap ' + A.bounceCap + ' reached at ' + what })

  let i = 0
  if (item.startAt) {
    i = stages.findIndex((s) => s.name === item.startAt)
    if (i < 0) return blocked('technical-impossibility', 'startAt ' + item.startAt + ' is not a stage of this item')
    for (const s of stages.slice(0, i)) if (s.kind === 'agent' && s.when === 'always') st.run.push(s.name)
  }
  while (i < stages.length) {
    const stage = stages[i]
    if (stage.kind === 'barrier-script') break
    const ad = ADAPTERS[stage.name]
    if (!ad) return blocked('technical-impossibility', 'no adapter for stage ' + stage.name)
    if (stage.when === 'scan-flagged' && !scanFlagged(st.lastRed)) { i++; continue }

    st.passes[stage.name] = (st.passes[stage.name] || 0) + 1
    const n = st.passes[stage.name]
    const label = ad.label + ' ' + id + (n > 1 ? ' pass ' + n : '')
    let model = models[stage.name]
    if (ad.role === 'build') {
      st.cycle++
      if (st.cycle === A.bounceCap && A.bounceCap > 1) model = tierUp(models[stage.name] || 'sonnet')
    }
    const opts = { label, phase: ad.phase, agentType: stage.agent, schema: ad.schema }
    if (model) opts.model = model
    let res = null
    try {
      res = await agent(promptFor(item, stage, ad, label, st), opts)
    } catch (e) {
      return blocked('technical-impossibility', stage.name + ' dispatch threw: ' + (e && e.message ? e.message : e))
    }
    if (!res) return blocked('technical-impossibility', stage.name + ' returned no result')
    st.run.push(stage.name)
    for (const c of Array.isArray(res.flashcards_flagged) ? res.flashcards_flagged : []) if (st.flash.indexOf(c) < 0) st.flash.push(c)

    if (ad.role === 'plan') {
      if (!res.ok) return blocked('technical-impossibility', stage.name + ' did not produce a plan')
      i++
    } else if (ad.role === 'red') {
      // A seal flagged only by qa_red_lint is a flagged seal, whatever status QA-Red chose (STORY-066-22).
      const lintOnly = res.status === 'BLOCKED' && !!res.sealed_sha && res.scan_exit === 1 &&
        Array.isArray(res.flags) && res.flags.length > 0 && res.flags.every((f) => f === 'qa_red_lint')
      if (lintOnly) log('wave_runner: ' + id + ' QA-Red returned BLOCKED on a seal flagged only by qa_red_lint; routed as a flagged seal')
      else if (res.status === 'BLOCKED') return blocked('spec-contradiction', text(res.spec_gap) || 'QA-Red reported a spec gap')
      if (!lintOnly && (res.status !== 'WRITTEN' || !res.sealed_sha)) return blocked('technical-impossibility', stage.name + ' wrote no sealed commit')
      st.lastRed = res
      st.qaSha = res.sealed_sha
      st.issue = ''
      i++
    } else if (ad.role === 'build') {
      if (res.status === 'blocked' && res.blocker_section === 'Red-Test' && idxOf('red') >= 0) {
        st.qaBounces++
        st.defectsIn.push('red-test')
        st.issue = text(res.notes) || stage.name + ' found the sealed red test wrong'
        if (st.qaBounces >= A.bounceCap) return escalate(stage.name)
        i = idxOf('red')
      } else if (res.status !== 'done' || !res.commit) {
        return blocked(res.blocker_section === 'Spec-Gap' ? 'spec-contradiction' : 'technical-impossibility', text(res.notes) || stage.name + ' blocked')
      } else {
        st.devSha = res.commit
        st.issue = ''
        i++
      }
    } else if (ad.role === 'verify') {
      if (res.result === 'PASS' || res.result === 'PASS-PENDING-SMOKE') { st.noneFails = 0; i++; continue }
      if (res.defect_in === 'none') {
        if (st.noneFails > 0) return blocked('technical-impossibility', 'QA-Verify failed twice outside the item (defect_in none): ' + text(res.defects))
        st.noneFails = 1
        continue
      }
      st.noneFails = 0
      const d = defectIn(res)
      st.qaBounces++
      st.defectsIn.push(d)
      st.issue = text(res.defects)
      if (d === 'spec') return blocked('spec-contradiction', 'QA-Verify found a spec defect: ' + st.issue)
      if (st.qaBounces >= A.bounceCap) return escalate(stage.name)
      i = idxOf(d === 'red-test' ? 'red' : 'build')
    } else {
      if (res.result === 'APPROVED' || res.result === 'PASS') { i++; continue }
      st.archBounces++
      st.issue = text(res.issue)
      if (st.archBounces >= A.bounceCap) return escalate(stage.name)
      i = idxOf(ad.role === 'red-check' ? 'red' : 'build')
    }
    if (i < 0) return blocked('technical-impossibility', 'rework target missing in the stage list')
  }

  if (!st.devSha || (hasRed && !st.qaSha)) return blocked('technical-impossibility', 'segment ended without the commits a GREEN verdict needs')
  return finish('GREEN')
}

async function safeSegment(item) {
  try {
    return await segment(item)
  } catch (e) {
    return {
      verdict: 'BLOCKED', storyId: item.id, runId: item.runId, devSha: null, qaSha: null, flashcards_flagged: [],
      counters: { qa_bounces: 0, arch_bounces: 0, breaker_hits: 0 }, tokens: { metering: 'unavailable' },
      lane: item.lane, stages_run: [], defects_in: [],
      blocker: { type: 'technical-impossibility', message: item.id + ': segment threw: ' + (e && e.message ? e.message : e) },
    }
  }
}

const merged = A.merged || []
const ready = []
const waiting = []
for (const it of A.items) {
  const needs = (it.upstream || []).filter((u) => merged.indexOf(u) < 0)
  if (needs.length === 0) ready.push(it)
  else waiting.push({ storyId: it.id, needs })
}
log('wave_runner: ' + ready.length + ' started, ' + waiting.length + ' waiting')
return { verdicts: await parallel(ready.map((it) => () => safeSegment(it))), waiting }
