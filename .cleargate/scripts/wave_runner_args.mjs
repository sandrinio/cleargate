#!/usr/bin/env node
/**
 * wave_runner_args.mjs — builds the `args` object for wave_runner.js (STORY-066-11).
 *
 * The runner is a Workflow script: it cannot read files or import. This helper reads the
 * real inputs (waves.json, state.json, the loop: block of config.yml, segment_stages.mjs)
 * and prints one JSON line the runner takes as `args`.
 *
 *   node wave_runner_args.mjs --sprint <SPRINT-ID> --wave <wave-id> [--item <ID> [--from <stage>] [--issue <text>]] [--validate <verdicts.json>]
 *
 * Exit 0 ok; 1 invalid verdicts (--validate); 2 usage or precondition (nothing on stdout).
 * Node built-ins only; stack-neutral (reads no package.json).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STAGE_NAMES, stagesFor, laneOf, normaliseLane } from './segment_stages.mjs';
import { BOUNCE_CAP } from './constants.mjs';
import {
  mintRunId,
  worktreeAddCommand,
  storyBases,
  integrationReady,
  validateVerdicts,
} from './launch_wave.mjs';
import { sprintBranchFor, resolveRepoRoot } from './dispatch_serial.mjs';
import { extractWorkItemIds, matchesId } from './lib/work-item-id.mjs';
import { withholdHoldouts } from './qa_red_lint.mjs';

export const USAGE = `Usage: node .cleargate/scripts/wave_runner_args.mjs --sprint <SPRINT-ID> --wave <wave-id> [--item <ID> [--from <stage>] [--issue <text>]] [--validate <verdicts.json>]
  Prints the args for wave_runner.js as one JSON line (exit 0).
  --item <ID>  args for that one item of the wave (re-run a blocked item; usage error when it is not in the wave or is Done)
  --from <stage>  needs --item; the agent stage of its lane to start at, never later than qa-verify (after qa-red it reuses the newest qa-red(<ID>) commit on story/<ID>)
  --issue <text>  needs --item; the rework input for the first stage
  --validate <verdicts.json>  check the runner's return with validateVerdicts in serial mode: exit 0 valid, 1 invalid. Takes a bare verdict array, {verdicts} (an object with a verdicts array) or the Workflow return {result:{verdicts}} (with its waiting list)
The repo root is ORCHESTRATOR_PROJECT_DIR, else the git top level of the cwd. Usage errors exit 2 with nothing on stdout.
`;

export const SHIPPED_MODEL_DEFAULTS = Object.freeze({
  models_by_lane: Object.freeze({ runtime: Object.freeze({ 'qa-verify': 'opus' }) }),
});

const MODEL_VALUES = ['haiku', 'sonnet', 'opus'];
// Lanes probed only to learn which stage names are agent stages (never to decide what runs).
const PROBE_LANES = ['standard', 'runtime'];
const AGENT_STAGE_NAMES = new Set(
  STAGE_NAMES.filter((n) => PROBE_LANES.some((l) => stagesFor(l).some((s) => s.name === n && s.kind === 'agent'))),
);

/**
 * Dependency-free line scan of the `loop:` block (precedent: close_sprint.mjs readVcsSprintPr).
 * Pure; bad entries become warnings and are ignored.
 * @param {string} text
 * @returns {{ models: Record<string,string>, models_by_lane: Record<string, Record<string,string>>, warnings: string[] }}
 */
export function readLoopConfig(text) {
  const out = { models: {}, models_by_lane: {}, warnings: [] };
  const lines = String(text ?? '').split('\n');
  let inLoop = false;
  let section = null;
  let lane = null;
  const okModel = (where, v) => {
    const m = v.toLowerCase();
    if (MODEL_VALUES.includes(m)) return m;
    out.warnings.push(`loop.${where}: '${v}' is not one of ${MODEL_VALUES.join(' | ')}; ignored`);
    return null;
  };
  const okStage = (where, s) => {
    if (AGENT_STAGE_NAMES.has(s)) return true;
    out.warnings.push(`loop.${where}: '${s}' is not an agent stage name; ignored`);
    return false;
  };
  for (const raw of lines) {
    const isTop = /^\S/.test(raw) && !/^#/.test(raw);
    if (!inLoop) {
      if (/^loop:\s*(#.*)?$/.test(raw)) inLoop = true;
      continue;
    }
    if (isTop) break;
    if (raw.trim() === '' || /^\t/.test(raw) || /^\s*#/.test(raw)) continue;
    const line = raw.replace(/\s+#.*$/, '').replace(/\s+$/, '');
    const m = /^( *)([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const indent = m[1].length;
    const key = m[2];
    const val = m[3].replace(/^["']|["']$/g, '').trim();
    if (indent === 2) {
      section = key === 'models' || key === 'models_by_lane' ? key : null;
      lane = null;
    } else if (indent === 4 && section === 'models') {
      if (val === '' || !okStage(`models.${key}`, key)) continue;
      const mv = okModel(`models.${key}`, val);
      if (mv) out.models[key] = mv;
    } else if (indent === 4 && section === 'models_by_lane') {
      if (normaliseLane(key) !== key) {
        out.warnings.push(`loop.models_by_lane.${key}: not a known lane; ignored`);
        lane = null;
      } else lane = key;
    } else if (indent === 6 && section === 'models_by_lane' && lane) {
      if (val === '' || !okStage(`models_by_lane.${lane}.${key}`, key)) continue;
      const mv = okModel(`models_by_lane.${lane}.${key}`, val);
      if (mv) (out.models_by_lane[lane] ??= {})[key] = mv;
    }
  }
  return out;
}

/** models_by_lane[lane][stage] (user over shipped default), then models[stage], then null. */
export function resolveModel(cfg, lane, stage) {
  return (
    cfg?.models_by_lane?.[lane]?.[stage] ??
    SHIPPED_MODEL_DEFAULTS.models_by_lane?.[lane]?.[stage] ??
    cfg?.models?.[stage] ??
    null
  );
}

/**
 * @param {{ plan: object, state: object|null, sprintId: string, waveId: string, configText?: string, findFile?: (id: string) => string|null, findView?: (id: string, file: string|null) => string|null,
 *   item?: string|null, from?: string|null, issue?: string|null, worktreeExists?: (id: string) => boolean,
 *   sealedRed?: (id: string) => string|null, branchTip?: (id: string) => string|null, planExists?: (id: string) => boolean }} o
 */
export function buildWaveArgs({
  plan,
  state,
  sprintId,
  waveId,
  configText = '',
  findFile = () => null,
  findView = (id, file) => file,
  item = null,
  from = null,
  issue = null,
  worktreeExists = () => false,
  sealedRed = () => null,
  branchTip = () => null,
  planExists = () => true,
}) {
  const sprintBranch = sprintBranchFor(sprintId);
  const wave = (plan?.waves ?? []).find((w) => w && w.wave === waveId);
  if (!wave) throw new Error(`unknown wave '${waveId}'`);
  const bases = storyBases(plan);
  const cfg = readLoopConfig(configText);
  const merged = Object.entries(state?.stories ?? {})
    .filter(([, v]) => v && (v.state === 'Done' || v.state === 'Sprint Review'))
    .map(([id]) => id)
    .sort();
  const mergedSet = new Set(merged);
  let ids = (wave.stories ?? []).filter((id) => !mergedSet.has(id));
  if (item) {
    if (!(wave.stories ?? []).includes(item)) throw new Error(`--item ${item} is not in wave '${waveId}'`);
    if (mergedSet.has(item)) throw new Error(`--item ${item} is already merged (${state?.stories?.[item]?.state})`);
    ids = [item];
  }
  const items = ids.map((id) => {
    const lane = normaliseLane(laneOf(id, { state, plan }));
    const upstream = plan.stories?.[id]?.upstream ?? [];
    const base =
      upstream.length > 0 && upstream.every((u) => mergedSet.has(u)) ? sprintBranch : (bases[id] ?? sprintBranch);
    const stages = stagesFor(lane);
    const models = {};
    for (const s of stages) if (s.kind === 'agent') models[s.name] = resolveModel(cfg, lane, s.name);
    return {
      id,
      lane,
      base,
      upstream,
      stages: JSON.parse(JSON.stringify(stages)),
      models,
      runId: mintRunId(id, sprintId),
      file: findFile(id),
      view_file: findView(id, findFile(id)),
    };
  });
  if (item) {
    const it = items[0];
    if (from) {
      const agentNames = it.stages.filter((s) => s.kind === 'agent').map((s) => s.name);
      if (!agentNames.includes(from)) {
        throw new Error(`--from ${from} is not an agent stage of lane '${it.lane}' (${agentNames.join(', ')})`);
      }
      const names = it.stages.map((s) => s.name);
      const at = names.indexOf(from);
      const qv = names.indexOf('qa-verify');
      const sp = names.indexOf('story-plan');
      if (qv >= 0 && at > qv) throw new Error(`--from ${from} would skip qa-verify; start at qa-verify or earlier`);
      if (sp >= 0 && at > sp && !planExists(item)) {
        throw new Error(`--from ${from} would skip story-plan but plans/${item}.md does not exist`);
      }
      it.startAt = from;
      const red = names.indexOf('qa-red');
      const dev = names.indexOf('developer');
      if (red >= 0 && at > red) {
        it.qaSha = sealedRed(item);
        if (!it.qaSha) throw new Error(`no qa-red(${item}) commit on story/${item}`);
      }
      if (dev >= 0 && at > dev) {
        it.devSha = branchTip(item);
        if (!it.devSha || it.devSha === it.qaSha) throw new Error(`no Developer commit on story/${item}`);
      }
    }
    if (issue) it.issue = issue;
  }
  const worktreeCommands = items
    .filter((it) => !worktreeExists(it.id))
    .filter((it) => (plan.stories?.[it.id] ? integrationReady(plan, it.id, merged) : true))
    .map((it) => worktreeAddCommand(it.id, it.base));
  return { sprintId, sprintBranch, bounceCap: BOUNCE_CAP, merged, worktreeCommands, items };
}

function readJson(file, what) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${what} (${file}): ${e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${what} is not valid JSON (${file}): ${e.message}`);
  }
}

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') f.help = true;
    else if (a === '--sprint' || a === '--wave' || a === '--validate' || a === '--item' || a === '--from' || a === '--issue') {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      f[a.slice(2)] = v;
    } else throw new Error(`unknown argument '${a}'`);
  }
  return f;
}

function usageFail(reason) {
  process.stderr.write(`wave_runner_args.mjs: ${reason}\n${USAGE}`);
  return 2;
}

export function main(argv = process.argv.slice(2), env = process.env) {
  let flags;
  try {
    flags = parseFlags(argv);
  } catch (e) {
    return usageFail(e.message);
  }
  if (flags.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (!flags.sprint) return usageFail('missing --sprint');
  if (!flags.wave) return usageFail('missing --wave');
  if ((flags.from || flags.issue) && !flags.item) return usageFail('--from and --issue need --item');
  try {
    const root = resolveRepoRoot(env);
    sprintBranchFor(flags.sprint);
    const sprintDir = path.join(root, '.cleargate', 'sprint-runs', flags.sprint);
    const plan = readJson(path.join(sprintDir, 'plans', 'waves.json'), 'waves.json');
    let state = null;
    try {
      state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    } catch {
      state = null;
    }
    let configText = '';
    try {
      configText = fs.readFileSync(path.join(root, '.cleargate', 'config.yml'), 'utf8');
    } catch {
      configText = '';
    }
    const findFile = (id) => {
      for (const dir of ['pending-sync', 'archive']) {
        const abs = path.join(root, '.cleargate', 'delivery', dir);
        let names = [];
        try {
          names = fs.readdirSync(abs).sort();
        } catch {
          continue;
        }
        const hit = names.find((n) => matchesId(n, id));
        if (hit) return `.cleargate/delivery/${dir}/${hit}`;
      }
      return null;
    };
    const wave = (plan.waves ?? []).find((w) => w && w.wave === flags.wave);
    if (!wave) throw new Error(`unknown wave '${flags.wave}'`);
    for (const id of wave.stories ?? []) {
      const found = extractWorkItemIds(String(id));
      if (found.length !== 1 || found[0] !== id) throw new Error(`wave item '${id}' is not exactly one work-item id`);
    }
    if (flags.validate) {
      const parsed = readJson(flags.validate, 'verdicts file');
      const verdicts = Array.isArray(parsed) ? parsed : (parsed?.verdicts ?? parsed?.result?.verdicts);
      try {
        validateVerdicts(verdicts, { mode: 'serial' });
      } catch (e) {
        process.stderr.write(`wave_runner_args.mjs: ${e.message}\n`);
        return 1;
      }
      process.stdout.write(`${JSON.stringify({ valid: true, count: verdicts.length })}\n`);
      return 0;
    }
    const git = (a) => {
      try {
        return execFileSync('git', a, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
      } catch {
        return null;
      }
    };
    const args = buildWaveArgs({
      plan,
      state,
      sprintId: flags.sprint,
      waveId: flags.wave,
      configText,
      findFile,
      findView: (id, file) => {
        if (!file) return file;
        let body;
        try {
          body = fs.readFileSync(path.join(root, file), 'utf8');
        } catch {
          return file;
        }
        const view = withholdHoldouts(body);
        if (view === null) return file;
        const rel = `.cleargate/sprint-runs/${flags.sprint}/.item-view-${id}.md`;
        fs.writeFileSync(path.join(root, rel), view);
        return rel;
      },
      item: flags.item ?? null,
      from: flags.from ?? null,
      issue: flags.issue ?? null,
      worktreeExists: (id) => fs.existsSync(path.join(root, '.worktrees', id)),
      sealedRed: (id) =>
        git(['log', '-1', '--format=%H', '--basic-regexp', `--grep=^qa-red(${id})`, `story/${id}`, '--']),
      branchTip: (id) => git(['rev-parse', '--verify', '-q', `story/${id}^{commit}`]),
      planExists: (id) => fs.existsSync(path.join(root, '.cleargate', 'sprint-runs', flags.sprint, 'plans', id + '.md')),
    });
    for (const w of readLoopConfig(configText).warnings) process.stderr.write(`wave_runner_args.mjs: warning: ${w}\n`);
    process.stdout.write(`${JSON.stringify(args)}\n`);
    return 0;
  } catch (e) {
    return usageFail(e.message);
  }
}

function isEntry() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}
if (isEntry()) process.exitCode = main();
