import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { scanRawItems } from '../wiki/scan.js';

export interface WikiAuditStatusOptions {
  /** Test seam: working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Test seam: frozen ISO timestamp (not used for output; reserved for future use) */
  now?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Apply safe status corrections to frontmatter */
  fix?: boolean;
  /** Required together with --fix to confirm writes in non-interactive mode */
  yes?: boolean;
  /** Suppress diff output */
  quiet?: boolean;
  /** Test seam: override isTTY detection */
  isTTY?: boolean;
  /** Test seam: override readline for confirmation prompt */
  promptReader?: () => Promise<string>;
}

const TERMINAL = new Set(['Completed', 'Done', 'Abandoned', 'Closed', 'Resolved']);

interface DriftItem {
  id: string;
  rawPath: string;
  absPath: string;
  bucket: string;
  currentStatus: string;
  rule: 'A' | 'B' | 'C';
  /** Suggested new status (undefined for Rule B — file move needed) */
  suggestedStatus?: string;
  /** Human-readable description for the report */
  description: string;
}

export async function wikiAuditStatusHandler(opts: WikiAuditStatusOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const stdout = opts.stdout ?? ((s: string) => { process.stdout.write(s); });
  const stderr = opts.stderr ?? ((s: string) => { process.stderr.write(s); });
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const isTTY = opts.isTTY ?? Boolean(process.stdout.isTTY);

  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');

  if (!fs.existsSync(deliveryRoot)) {
    stderr(`audit-status: .cleargate/delivery/ not found at ${deliveryRoot}\n`);
    exit(1);
    return;
  }

  const items = scanRawItems(deliveryRoot, cwd);

  // Build a lookup of epic id → child stories (with terminal status check)
  const storiesByEpic = new Map<string, typeof items>();
  for (const item of items) {
    if (item.bucket !== 'stories') continue;
    const epicRef = String(item.fm['parent_epic_ref'] ?? '').replace(/^\[\[|\]\]$/g, '');
    if (!epicRef) continue;
    if (!storiesByEpic.has(epicRef)) storiesByEpic.set(epicRef, []);
    storiesByEpic.get(epicRef)!.push(item);
  }

  const driftItems: DriftItem[] = [];

  for (const item of items) {
    const currentStatus = String(item.fm['status'] ?? '');
    const isTerminal = TERMINAL.has(currentStatus);
    const inArchive = item.rawPath.includes('/archive/');
    const inPendingSync = item.rawPath.includes('/pending-sync/');

    // Rule A: in archive/ but status is non-terminal
    if (inArchive && !isTerminal) {
      // Determine suggested fix: Completed if all child stories terminal (epics/sprints), else Abandoned
      let suggestedStatus = 'Abandoned';
      if (item.bucket === 'epics' || item.bucket === 'sprints') {
        const childStories = storiesByEpic.get(item.id) ?? [];
        if (childStories.length > 0 && childStories.every((s) => TERMINAL.has(String(s.fm['status'] ?? '')))) {
          suggestedStatus = 'Completed';
        }
      }

      driftItems.push({
        id: item.id,
        rawPath: item.rawPath,
        absPath: item.absPath,
        bucket: item.bucket,
        currentStatus,
        rule: 'A',
        suggestedStatus,
        description: `Rule A — archived with non-terminal status '${currentStatus}'`,
      });
    }

    // Rule B: in pending-sync/ but status is terminal
    if (inPendingSync && isTerminal) {
      const archivePath = item.rawPath.replace('/pending-sync/', '/archive/');
      driftItems.push({
        id: item.id,
        rawPath: item.rawPath,
        absPath: item.absPath,
        bucket: item.bucket,
        currentStatus,
        rule: 'B',
        // No suggestedStatus — Rule B requires file move, not status change
        description: `Rule B — pending-sync with terminal status '${currentStatus}'; run: git mv ${item.rawPath} ${archivePath.replace(/\/[^/]+$/, '/')}`,
      });
    }

    // Rule C: sprint file, non-terminal status, all children of its epics are terminal
    if (item.bucket === 'sprints' && !isTerminal) {
      const epicRefs = item.fm['epics'];
      if (!epicRefs) continue; // No epics key → Rule C does not fire
      const epicsArr = Array.isArray(epicRefs) ? epicRefs : [epicRefs];
      if (epicsArr.length === 0) continue;

      let totalChildren = 0;
      let terminalChildren = 0;

      for (const epicRef of epicsArr) {
        const epicId = String(epicRef).replace(/^\[\[|\]\]$/g, '');
        const children = storiesByEpic.get(epicId) ?? [];
        totalChildren += children.length;
        terminalChildren += children.filter((s) => TERMINAL.has(String(s.fm['status'] ?? ''))).length;
      }

      if (totalChildren > 0 && totalChildren === terminalChildren) {
        driftItems.push({
          id: item.id,
          rawPath: item.rawPath,
          absPath: item.absPath,
          bucket: item.bucket,
          currentStatus,
          rule: 'C',
          suggestedStatus: 'Completed',
          description: `Rule C — ${terminalChildren}/${totalChildren} child stories terminal; suggest Completed`,
        });
      }
    }
  }

  // Print report
  if (driftItems.length === 0) {
    stdout('audit-status: clean (0 drift)\n');
    exit(0);
    return;
  }

  for (const d of driftItems) {
    if (d.rule === 'B') {
      // Rule B: emit git mv hint
      const archivePath = d.rawPath.replace('/pending-sync/', '/archive/');
      const archiveDir = archivePath.replace(/\/[^/]+$/, '/');
      stdout(`${d.id}: ${d.description}\n`);
      stdout(`  git mv ${d.rawPath} ${archiveDir}\n`);
    } else {
      stdout(`${d.id}: ${d.description}\n`);
    }
  }

  if (!opts.fix) {
    exit(1);
    return;
  }

  // --fix mode
  const fixable = driftItems.filter((d) => d.rule !== 'B' && d.suggestedStatus !== undefined);
  const ruleB = driftItems.filter((d) => d.rule === 'B');

  if (ruleB.length > 0) {
    for (const d of ruleB) {
      stdout(`  (skipping ${d.id}: Rule B requires manual file move, not a status change)\n`);
    }
  }

  if (fixable.length === 0) {
    stdout('audit-status: no auto-fixable items (Rule B items require manual git mv)\n');
    exit(0);
    return;
  }

  // Confirmation
  if (!opts.yes) {
    if (!isTTY) {
      stderr('audit-status: --fix requires --yes in non-interactive mode\n');
      exit(2);
      return;
    }

    // TTY: prompt
    let answer: string;
    if (opts.promptReader) {
      answer = await opts.promptReader();
    } else {
      answer = await new Promise<string>((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`apply ${fixable.length} changes? [y/N] `, (ans) => {
          rl.close();
          resolve(ans);
        });
      });
    }

    if (!answer.trim().toLowerCase().startsWith('y')) {
      stdout('aborted\n');
      exit(2);
      return;
    }
  }

  // Apply fixes via line-surgery regex (do NOT round-trip through parseFrontmatter)
  for (const d of fixable) {
    const rawText = fs.readFileSync(d.absPath, 'utf8');
    const updated = applyStatusFix(rawText, d.suggestedStatus!);

    if (!opts.quiet) {
      stdout(`--- ${d.rawPath}\n`);
      stdout(`+++ ${d.rawPath}\n`);
      stdout(`@@ status change @@\n`);
      // Show the old and new status line
      const oldLine = rawText.split('\n').find((l) => /^status:/.test(l)) ?? '';
      const newLine = updated.split('\n').find((l) => /^status:/.test(l)) ?? '';
      stdout(`-${oldLine}\n`);
      stdout(`+${newLine}\n`);
    }

    fs.writeFileSync(d.absPath, updated, 'utf8');
  }

  stdout(`audit-status: applied ${fixable.length} fix(es)\n`);
  exit(0);
}

/**
 * Replace the first `status:` line inside the first `---` YAML front-matter block.
 * Everything else is byte-identical (no round-trip through parseFrontmatter).
 */
function applyStatusFix(rawText: string, newStatus: string): string {
  // Find the closing --- of the frontmatter
  const lines = rawText.split('\n');
  if (lines[0] !== '---') return rawText; // no frontmatter — leave untouched

  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) return rawText; // malformed — leave untouched

  // Replace only the first `status:` line within the frontmatter block
  let replaced = false;
  for (let i = 1; i < closeIdx; i++) {
    if (!replaced && /^status:/.test(lines[i])) {
      lines[i] = `status: "${newStatus}"`;
      replaced = true;
    }
  }

  return lines.join('\n');
}
