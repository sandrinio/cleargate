#!/usr/bin/env node
/**
 * assign_lane.mjs — STORY-066-05 (EPIC-066)
 *
 * Computes each work item's lane (fast | standard | runtime) from risk signals read out of the
 * item file. No judgement: same file in, same lane out, with a one-sentence reason.
 *
 * Usage: node assign_lane.mjs <item-file>... [--write <waves.json>]
 *   stdout: one JSON array line, one object per item: { id, lane, signals, reason }
 *   exit 0 ok; 2 usage, unreadable file, or an id that cannot be read from the file name.
 *   --write: sets waves.json lane_signals[id] (computed lane = the floor) and lane_assignments[id]
 *            (max of an existing valid lane and the computed lane: raise, never lower).
 * Export (STORY-066-16): assignLaneForFile(file) -> { id, lane, signals, reason } | null; never exits
 *   (init_sprint.mjs computes kickoff lanes with it when plans/waves.json does not exist).
 *
 * Rules (first match wins): runtime when ui_surface, subsystems >= 2, or proof_tier container|live;
 * fast when 1 <= scenarios <= 2, subsystems == 1, no ui/forbidden/new-dependency signal, proof_tier
 * absent or unit; otherwise standard (including subsystems == 0 and scenarios == 0: an unparsable
 * surface or an item with no parsed scenario is never fast).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractWorkItemIds } from './lib/work-item-id.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const LANE_RANK = { fast: 0, standard: 1, runtime: 2 };

/** Seeded from the forbidden-surface table of the Architect rubric. */
export const FORBIDDEN_SURFACE_PATTERNS = [
  /(^|\/)(migrations?|db|auth|security)\//,
  /(^|\/)[^/]*(schema|migration)[^/]*\.(sql|prisma)$/,
  /(^|\/)auth-[^/]*$/,
  /(^|\/)(cleargate\.config\.json|config\.ts)$/,
  /(^|\/)adapters\//,
  /(^|\/)MANIFEST\.json$/,
  /(^|\/)(token|invite)[^/]*\.(ts|js|mjs)$/,
];

const UI_EXTS = new Set(['.svelte', '.vue', '.tsx', '.jsx', '.html', '.htm', '.css', '.scss', '.sass', '.less']);
const UI_DIRS = new Set(['ui', 'components', 'pages', 'views', 'frontend', 'static', 'public']);
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'fixtures']);
const DEP_MANIFESTS = new Set([
  'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', 'requirements.txt', 'pom.xml', 'Gemfile', 'build.gradle',
]);

function cleanPath(p) {
  return String(p).trim().replace(/^(Yes|No)\s*[—–-]\s*/, '').trim();
}

function isTestPath(p) {
  const segs = p.split('/');
  const base = segs[segs.length - 1];
  if (segs.slice(0, -1).some((s) => TEST_DIRS.has(s))) return true;
  return /\.test\.|\.spec\./.test(base) || /_test\./.test(base);
}

function subsystemKey(p) {
  const dirs = p.split('/').slice(0, -1);
  return dirs.length === 0 ? '.' : dirs.slice(0, 2).join('/');
}

function countScenarios(text) {
  let count = 0;
  let inGherkin = false;
  let inOther = false;
  for (const line of text.split('\n')) {
    const fence = line.match(/^\s*```(\S*)/);
    if (fence) {
      if (inGherkin || inOther) {
        inGherkin = false;
        inOther = false;
      } else if (fence[1] === 'gherkin') {
        inGherkin = true;
      } else {
        inOther = true;
      }
      continue;
    }
    if (inGherkin && /^\s*Scenario( Outline)?:/.test(line)) count++;
  }
  return count;
}

function readProofTier(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') break;
    const m = lines[i].match(/^proof_tier:\s*"?(\w+)"?/);
    if (m) return m[1];
  }
  return null;
}

export function computeSignals(itemText, surfacePaths) {
  const surface = [...new Set((surfacePaths || []).map(cleanPath).filter(Boolean))].filter((p) => !isTestPath(p));
  const keys = new Set(surface.map(subsystemKey));
  const ui = surface.some((p) => {
    const segs = p.split('/');
    const base = segs[segs.length - 1];
    const dot = base.lastIndexOf('.');
    const ext = dot >= 0 ? base.slice(dot).toLowerCase() : '';
    return UI_EXTS.has(ext) || segs.slice(0, -1).some((s) => UI_DIRS.has(s));
  });
  return {
    scenarios: countScenarios(itemText),
    subsystems: keys.size,
    ui_surface: ui,
    forbidden_surface: surface.some((p) => FORBIDDEN_SURFACE_PATTERNS.some((re) => re.test(p))),
    new_dependency: surface.some((p) => DEP_MANIFESTS.has(p.split('/').pop())),
    proof_tier: readProofTier(itemText),
  };
}

/** Returns { lane, reason }. Pure. `surface` is optional detail for the reason sentence. */
export function laneFor(signals, surface = []) {
  const keys = [...new Set(surface.map(cleanPath).filter((p) => p && !isTestPath(p)).map(subsystemKey))].sort();
  const firstUi = surface.map(cleanPath).find((p) => {
    const segs = p.split('/');
    const base = segs[segs.length - 1];
    const dot = base.lastIndexOf('.');
    return UI_EXTS.has(dot >= 0 ? base.slice(dot).toLowerCase() : '') || segs.slice(0, -1).some((s) => UI_DIRS.has(s));
  });
  const s = signals;
  if (s.ui_surface) return { lane: 'runtime', reason: `ui_surface: ${firstUi ?? 'true'}` };
  if (s.subsystems >= 2) return { lane: 'runtime', reason: `subsystems: ${s.subsystems}${keys.length ? ` (${keys.join(', ')})` : ''}` };
  if (s.proof_tier === 'container' || s.proof_tier === 'live') return { lane: 'runtime', reason: `proof_tier: ${s.proof_tier}` };
  if (s.scenarios === 0) return { lane: 'standard', reason: 'scenarios: 0 (none parsed; never fast)' };
  if (s.scenarios > 2) return { lane: 'standard', reason: `scenarios: ${s.scenarios} (> 2)` };
  if (s.subsystems === 0) return { lane: 'standard', reason: 'subsystems: 0 (no parsable file surface)' };
  if (s.forbidden_surface) return { lane: 'standard', reason: 'forbidden_surface: true' };
  if (s.new_dependency) return { lane: 'standard', reason: 'new_dependency: true' };
  if (s.proof_tier !== null && s.proof_tier !== 'unit') return { lane: 'standard', reason: `proof_tier: ${s.proof_tier} (not unit)` };
  return {
    lane: 'fast',
    reason: `fast: ${s.scenarios} scenario${s.scenarios === 1 ? '' : 's'}, one subsystem${keys.length ? ` (${keys[0]})` : ''}, no risk signal`,
  };
}

function usage(msg) {
  if (msg) process.stderr.write(`${msg}\n`);
  process.stderr.write('Usage: node assign_lane.mjs <item-file>... [--write <waves.json>]\n');
  process.exit(2);
}

function surfaceOf(file) {
  const r = spawnSync('bash', [path.join(HERE, 'collision_surface.sh'), file], {
    encoding: 'utf8',
    env: { ...process.env, CLEARGATE_REPO_ROOT: path.resolve(HERE, '..', '..') },
  });
  return (r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * STORY-066-16: the lane of one item file, for callers that must keep running (init_sprint.mjs).
 * Returns { id, lane, signals, reason }, or null when the file cannot be read or its name holds no
 * work-item id. Never calls process.exit.
 */
export function assignLaneForFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const id = extractWorkItemIds(path.basename(file))[0];
  if (!id) return null;
  const surface = surfaceOf(file).map(cleanPath).filter(Boolean);
  const signals = computeSignals(text, surface);
  const { lane, reason } = laneFor(signals, surface);
  return { id, lane, signals, reason };
}

function assign(file) {
  const result = assignLaneForFile(file);
  if (result) return result;
  try {
    fs.readFileSync(file, 'utf8');
  } catch (err) {
    usage(`cannot read ${file}: ${err.message}`);
  }
  usage(`no work-item id in file name: ${path.basename(file)}`);
}

function main(argv) {
  const files = [];
  let writePath = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write') {
      writePath = argv[++i];
      if (!writePath) usage('--write requires a path');
    } else if (argv[i].startsWith('--')) {
      usage(`unknown flag ${argv[i]}`);
    } else {
      files.push(argv[i]);
    }
  }
  if (files.length === 0) usage();
  const results = files.map(assign);

  if (writePath) {
    let waves = {};
    if (fs.existsSync(writePath)) {
      try {
        waves = JSON.parse(fs.readFileSync(writePath, 'utf8'));
      } catch (err) {
        usage(`cannot parse ${writePath}: ${err.message}`);
      }
    }
    if (!waves.lane_assignments || typeof waves.lane_assignments !== 'object') waves.lane_assignments = {};
    if (!waves.lane_signals || typeof waves.lane_signals !== 'object') waves.lane_signals = {};
    for (const r of results) {
      waves.lane_signals[r.id] = { lane: r.lane, signals: r.signals, reason: r.reason };
      const existing = waves.lane_assignments[r.id];
      waves.lane_assignments[r.id] =
        Object.hasOwn(LANE_RANK, existing) && LANE_RANK[existing] > LANE_RANK[r.lane] ? existing : r.lane;
    }
    fs.writeFileSync(writePath, JSON.stringify(waves, null, 2) + '\n');
  }

  process.stdout.write(JSON.stringify(results) + '\n');
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) main(process.argv.slice(2));
