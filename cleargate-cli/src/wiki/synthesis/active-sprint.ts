import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawItem } from '../scan.js';
import { renderTemplate } from './render.js';

/**
 * Compile the active-sprint synthesis page.
 * Loads template from templates/synthesis/active-sprint.md.
 * Partitions sprints by activated_at / completed_at frontmatter values.
 */
export function compile(state: RawItem[], templateDir?: string): string {
  const tplDir = templateDir ?? resolveDefaultTemplateDir();
  const tpl = fs.readFileSync(path.join(tplDir, 'active-sprint.md'), 'utf8');

  const sprints = state.filter((i) => i.bucket === 'sprints');

  // Partition sprints:
  // - active: activated_at is set (non-null, non-empty) AND completed_at is not set
  // - completed: completed_at is set
  // - planned: neither activated_at nor completed_at is set
  const active = sprints.filter((s) => isSet(s.fm['activated_at']) && !isSet(s.fm['completed_at']));
  const completed = sprints.filter((s) => isSet(s.fm['completed_at']));
  const planned = sprints.filter((s) => !isSet(s.fm['activated_at']) && !isSet(s.fm['completed_at']));

  const data: Record<string, unknown> = {
    active: active.map((s) => ({ id: s.id, status: String(s.fm['status'] ?? 'unknown') })),
    no_active: active.length === 0 ? [{}] : [],
    planned: planned.map((s) => ({ id: s.id, status: String(s.fm['status'] ?? 'unknown') })),
    no_planned: planned.length === 0 ? [{}] : [],
    completed: completed.slice(0, 3).map((s) => ({
      id: s.id,
      completed_at: String(s.fm['completed_at'] ?? ''),
    })),
    no_completed: completed.length === 0 ? [{}] : [],
  };

  return renderTemplate(tpl, data);
}

function isSet(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s !== '' && s !== 'null';
}

function resolveDefaultTemplateDir(): string {
  // tsup bundles all modules into dist/cli.js.
  // When running the built bundle: import.meta.url = file://.../cleargate-cli/dist/cli.js
  //   __dirname = cleargate-cli/dist/
  //   ../templates/synthesis = cleargate-cli/templates/synthesis ✓ (source)
  //   AND dist/templates/synthesis is also available (copied by onSuccess) ✓
  //
  // When vitest runs source (test seam): templateDir is always passed explicitly,
  // so this default is only used for the built/production case.
  //
  // Strategy: go one level up from the file containing this code (works for both
  // the dist/ bundle and npm-published dist/ layout), then into templates/synthesis.
  // For dist/cli.js: one up = package root → templates/synthesis. ✓
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', 'templates', 'synthesis');
}
