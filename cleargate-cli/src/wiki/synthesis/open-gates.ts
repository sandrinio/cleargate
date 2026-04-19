import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawItem } from '../scan.js';
import { renderTemplate } from './render.js';

/**
 * Compile the open-gates (blocked items) synthesis page.
 * Loads template from templates/synthesis/open-gates.md.
 *
 * Three gate buckets (matching real corpus textual statuses):
 *   Gate 1 — proposals with approved: false OR status: "Draft" / "Approved" (not yet shipped)
 *   Gate 2 — stories with ambiguity starting with 🟡 or 🔴
 *   Gate 3 — any item with status: "Ready" AND remote_id empty / null
 *
 * NOTE: The previous implementation filtered on status.includes('🔴') which matched
 * zero items in the real corpus (actual statuses are textual: Draft, Ready, Planned,
 * Active, Completed, Approved). This is the corpus-shape fix for STORY-002-09.
 */
export function compile(state: RawItem[], templateDir?: string): string {
  const tplDir = templateDir ?? resolveDefaultTemplateDir();
  const tpl = fs.readFileSync(path.join(tplDir, 'open-gates.md'), 'utf8');

  // Gate 1: proposals pending approval
  const gate1 = state.filter((i) => {
    if (i.bucket !== 'proposals') return false;
    const status = String(i.fm['status'] ?? '');
    const approved = i.fm['approved'];
    // Proposals that are Draft or explicitly not approved
    return status === 'Draft' || approved === false || approved === 'false';
  });

  // Gate 2: stories with elevated ambiguity (🟡 Medium or 🔴 High)
  const gate2 = state.filter((i) => {
    if (i.bucket !== 'stories') return false;
    const ambiguity = String(i.fm['ambiguity'] ?? '');
    return ambiguity.startsWith('🟡') || ambiguity.startsWith('🔴');
  });

  // Gate 3: items that are Ready but not yet pushed (remote_id empty or null)
  const gate3 = state.filter((i) => {
    const status = String(i.fm['status'] ?? '');
    if (status !== 'Ready') return false;
    const remoteId = i.fm['remote_id'];
    return remoteId === null || remoteId === undefined || String(remoteId).trim() === '';
  });

  const data: Record<string, unknown> = {
    gate1: gate1.map((i) => ({ id: i.id, status: String(i.fm['status'] ?? '') })),
    no_gate1: gate1.length === 0 ? [{}] : [],
    gate2: gate2.map((i) => ({ id: i.id, ambiguity: String(i.fm['ambiguity'] ?? '') })),
    no_gate2: gate2.length === 0 ? [{}] : [],
    gate3: gate3.map((i) => ({ id: i.id, status: String(i.fm['status'] ?? '') })),
    no_gate3: gate3.length === 0 ? [{}] : [],
  };

  return renderTemplate(tpl, data);
}

function resolveDefaultTemplateDir(): string {
  // Bundle: dist/cli.js → __dirname = dist/, .. = package root → templates/synthesis ✓
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', 'templates', 'synthesis');
}
