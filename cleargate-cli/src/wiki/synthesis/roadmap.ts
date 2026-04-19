import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawItem } from '../scan.js';
import { renderTemplate } from './render.js';

/**
 * Compile the roadmap synthesis page.
 * Loads template from templates/synthesis/roadmap.md.
 *
 * Sprint buckets (by activated_at / completed_at):
 *   in-flight: activated_at set AND completed_at not set
 *   planned:   neither set
 *   shipped:   completed_at set
 *
 * Epic buckets (by status):
 *   active:  Active / In Progress / 🟢-prefixed
 *   planned: Ready / Planned / Draft
 *   shipped: Completed / Approved
 */
export function compile(state: RawItem[], templateDir?: string): string {
  const tplDir = templateDir ?? resolveDefaultTemplateDir();
  const tpl = fs.readFileSync(path.join(tplDir, 'roadmap.md'), 'utf8');

  const sprints = state.filter((i) => i.bucket === 'sprints');
  const epics = state.filter((i) => i.bucket === 'epics');

  // Sprint partitions
  const inFlightSprints = sprints.filter(
    (s) => isSet(s.fm['activated_at']) && !isSet(s.fm['completed_at']),
  );
  const plannedSprints = sprints.filter(
    (s) => !isSet(s.fm['activated_at']) && !isSet(s.fm['completed_at']),
  );
  const shippedSprints = sprints.filter((s) => isSet(s.fm['completed_at']));

  // Epic partitions
  const activeEpics = epics.filter((e) => isActiveStatus(String(e.fm['status'] ?? '')));
  const plannedEpics = epics.filter((e) => isPlannedStatus(String(e.fm['status'] ?? '')));
  const shippedEpics = epics.filter((e) => isShippedStatus(String(e.fm['status'] ?? '')));

  const data: Record<string, unknown> = {
    in_flight_sprints: inFlightSprints.map((s) => ({
      id: s.id,
      activated_at: String(s.fm['activated_at'] ?? ''),
    })),
    no_in_flight_sprints: inFlightSprints.length === 0 ? [{}] : [],

    planned_sprints: plannedSprints.map((s) => ({
      id: s.id,
      status: String(s.fm['status'] ?? ''),
    })),
    no_planned_sprints: plannedSprints.length === 0 ? [{}] : [],

    shipped_sprints: shippedSprints.map((s) => ({
      id: s.id,
      completed_at: String(s.fm['completed_at'] ?? ''),
    })),
    no_shipped_sprints: shippedSprints.length === 0 ? [{}] : [],

    active_epics: activeEpics.map((e) => ({ id: e.id, status: String(e.fm['status'] ?? '') })),
    no_active_epics: activeEpics.length === 0 ? [{}] : [],

    planned_epics: plannedEpics.map((e) => ({ id: e.id, status: String(e.fm['status'] ?? '') })),
    no_planned_epics: plannedEpics.length === 0 ? [{}] : [],

    shipped_epics: shippedEpics.map((e) => ({ id: e.id, status: String(e.fm['status'] ?? '') })),
    no_shipped_epics: shippedEpics.length === 0 ? [{}] : [],
  };

  return renderTemplate(tpl, data);
}

function isSet(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s !== '' && s !== 'null';
}

function isActiveStatus(status: string): boolean {
  return (
    status === 'Active' ||
    status === 'In Progress' ||
    status.startsWith('🟢') ||
    status === '🟡 in-flight'
  );
}

function isPlannedStatus(status: string): boolean {
  return status === 'Ready' || status === 'Planned' || status === 'Draft';
}

function isShippedStatus(status: string): boolean {
  return status === 'Completed' || status === 'Approved';
}

function resolveDefaultTemplateDir(): string {
  // Bundle: dist/cli.js → __dirname = dist/, .. = package root → templates/synthesis ✓
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', 'templates', 'synthesis');
}
