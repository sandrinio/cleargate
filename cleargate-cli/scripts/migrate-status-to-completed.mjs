#!/usr/bin/env node
/**
 * migrate-status-to-completed.mjs — CR-067 Phase A migration script
 *
 * Walks .cleargate/delivery/{pending-sync,archive}/**\/*.md and rewrites
 * `status: Done|Verified` → `status: Completed` in frontmatter only.
 * Quoted variants (`status: "Done"`, `status: 'Verified'`) are also handled.
 *
 * Non-terminal stale statuses (Approved, Draft, Triaged, 🟢) are flagged
 * for human review but NOT rewritten.
 *
 * Usage:
 *   node migrate-status-to-completed.mjs [--dry-run|--apply] [--delivery-root <path>]
 *
 * Modes:
 *   --dry-run  (default) — prints what would be rewritten, mutates nothing
 *   --apply    — acquires .cleargate/.migration-lock, rewrites files atomically
 *
 * Exit codes:
 *   0 — success (even if 0 files rewritten)
 *   1 — error (lock already held by live process, or unexpected I/O error)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Constants ────────────────────────────────────────────────────────────────

const TERMINAL_REWRITES = [
  // Unquoted
  { regex: /^(status:\s*)Done(\s*)$/m, label: 'Done' },
  { regex: /^(status:\s*)Verified(\s*)$/m, label: 'Verified' },
  // Double-quoted
  { regex: /^(status:\s*)"Done"(\s*)$/m, label: 'Done' },
  { regex: /^(status:\s*)"Verified"(\s*)$/m, label: 'Verified' },
  // Single-quoted
  { regex: /^(status:\s*)'Done'(\s*)$/m, label: 'Done' },
  { regex: /^(status:\s*)'Verified'(\s*)$/m, label: 'Verified' },
];

// Non-terminal statuses that should be flagged but not rewritten
const STALE_STATUS_REGEX = /^status:\s*["']?(Approved|Draft|Triaged|🟢)["']?\s*$/m;

// ── Argv parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  let dryRun = true; // default: dry-run
  let deliveryRoot = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--apply') {
      dryRun = false;
    } else if (args[i] === '--delivery-root') {
      i++;
      deliveryRoot = args[i];
    }
  }

  if (!deliveryRoot) {
    // Default: .cleargate/delivery relative to cwd
    deliveryRoot = path.join(process.cwd(), '.cleargate', 'delivery');
  }

  return { dryRun, deliveryRoot };
}

// ── Frontmatter extraction ───────────────────────────────────────────────────

/**
 * Extracts the first frontmatter block from raw file content.
 * Returns { head: string, rest: string } where head is the text up to and
 * including the closing '---' line, and rest is everything after.
 *
 * Returns null if no frontmatter block is found.
 */
function extractFrontmatter(content) {
  // Must start with ---\n
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return null;
  }

  // Find the closing ---
  const afterOpen = content.startsWith('---\r\n')
    ? content.indexOf('\r\n', 4) + 2
    : content.indexOf('\n', 3) + 1;

  const closeIdx = content.indexOf('\n---\n', afterOpen);
  const closeIdxWin = content.indexOf('\n---\r\n', afterOpen);

  let closingEnd;
  if (closeIdx === -1 && closeIdxWin === -1) {
    return null;
  } else if (closeIdx === -1) {
    closingEnd = closeIdxWin + '\n---\r\n'.length;
  } else if (closeIdxWin === -1) {
    closingEnd = closeIdx + '\n---\n'.length;
  } else {
    closingEnd = Math.min(closeIdx, closeIdxWin);
    closingEnd += content[closingEnd + 3] === '\r' ? '\n---\r\n'.length : '\n---\n'.length;
  }

  const head = content.slice(0, closingEnd);
  const rest = content.slice(closingEnd);
  return { head, rest };
}

// ── File processing ──────────────────────────────────────────────────────────

/**
 * Processes a single markdown file.
 * Returns an object describing what was found/changed.
 */
function processFile(filePath, dryRun) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const fm = extractFrontmatter(raw);

  if (!fm) {
    return { action: 'skip', reason: 'no-frontmatter' };
  }

  const { head, rest } = fm;
  let newHead = head;
  let rewriteLabel = null;

  // Try to apply terminal rewrites ONLY within the frontmatter head
  for (const { regex, label } of TERMINAL_REWRITES) {
    if (regex.test(newHead)) {
      newHead = newHead.replace(regex, `$1Completed$2`);
      rewriteLabel = label;
      break; // one status line per file
    }
  }

  if (rewriteLabel !== null) {
    // A terminal rewrite fired
    if (dryRun) {
      console.log(`Would rewrite: ${filePath} (${rewriteLabel} → Completed)`);
      return { action: 'would-rewrite', label: rewriteLabel };
    }

    // Atomic write: tmp + rename
    const newContent = newHead + rest;
    const tmpPath = filePath + '.migration-tmp-' + process.pid;
    try {
      fs.writeFileSync(tmpPath, newContent, 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      // Clean up tmp if rename failed
      try { fs.unlinkSync(tmpPath); } catch {}
      throw err;
    }
    return { action: 'rewritten', label: rewriteLabel };
  }

  // Check for non-terminal stale status (flag only)
  if (STALE_STATUS_REGEX.test(head)) {
    const match = head.match(STALE_STATUS_REGEX);
    const staleStatus = match ? match[1] : 'unknown';
    return { action: 'flagged', staleStatus };
  }

  return { action: 'skip', reason: 'already-completed-or-other' };
}

// ── Lock management ──────────────────────────────────────────────────────────

function acquireLock(lockPath) {
  try {
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;

    // Lock exists — check if the PID is still alive
    let existingPid;
    try {
      const content = fs.readFileSync(lockPath, 'utf8').trim();
      existingPid = parseInt(content, 10);
    } catch {
      // Cannot read lock — treat as stale
      existingPid = NaN;
    }

    if (!isNaN(existingPid)) {
      try {
        process.kill(existingPid, 0); // throws ESRCH if not running
        // Process is alive — lock is held
        return false;
      } catch (killErr) {
        if (killErr.code === 'ESRCH') {
          // Process is dead — reclaim the lock
          console.warn(`[migrate] Warning: reclaiming stale lock held by dead PID ${existingPid}`);
          fs.writeFileSync(lockPath, String(process.pid), 'utf8');
          return true;
        }
        // EPERM or other — process exists but we can't signal it; treat as held
        return false;
      }
    } else {
      // Unreadable PID — reclaim
      console.warn('[migrate] Warning: reclaiming lock with unreadable PID');
      fs.writeFileSync(lockPath, String(process.pid), 'utf8');
      return true;
    }
  }
}

function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Ignore — best effort
  }
}

// ── Directory walk ───────────────────────────────────────────────────────────

function walkDelivery(deliveryRoot) {
  const files = [];
  for (const subdir of ['pending-sync', 'archive']) {
    const dir = path.join(deliveryRoot, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, deliveryRoot } = parseArgs(process.argv);

  if (dryRun) {
    console.log('[migrate] Running in --dry-run mode. No files will be modified.');
    console.log(`[migrate] Scanning: ${deliveryRoot}`);
    console.log('[migrate] Run with --apply to apply changes.\n');
  } else {
    console.log('[migrate] Running in --apply mode.');
    console.log(`[migrate] Scanning: ${deliveryRoot}`);
  }

  // Lock path: one level up from deliveryRoot, inside .cleargate/
  const lockPath = path.join(deliveryRoot, '..', '.migration-lock');
  let lockAcquired = false;

  if (!dryRun) {
    lockAcquired = acquireLock(lockPath);
    if (!lockAcquired) {
      process.stderr.write(
        `Error: CR-067 migration in progress (.migration-lock held); retry in 30s\n`,
      );
      process.exit(1);
    }
  }

  // Ensure cleanup on exit
  const cleanup = () => {
    if (lockAcquired) releaseLock(lockPath);
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    const files = walkDelivery(deliveryRoot);

    if (files.length === 0) {
      console.log('[migrate] No .md files found in delivery tree.');
      console.log('Rewrote: 0 files (0 Done, 0 Verified). Flagged for human review: 0 files: []');
      return;
    }

    let doneCount = 0;
    let verifiedCount = 0;
    const flaggedFiles = [];

    for (const filePath of files) {
      let result;
      try {
        result = processFile(filePath, dryRun);
      } catch (err) {
        process.stderr.write(`Error processing ${filePath}: ${err.message}\n`);
        continue;
      }

      if (result.action === 'rewritten' || result.action === 'would-rewrite') {
        if (result.label === 'Done') doneCount++;
        else if (result.label === 'Verified') verifiedCount++;
      } else if (result.action === 'flagged') {
        flaggedFiles.push(path.basename(filePath));
      }
    }

    const totalRewrote = doneCount + verifiedCount;
    const prefix = dryRun ? 'Would rewrite' : 'Rewrote';
    console.log(
      `${prefix}: ${totalRewrote} files (${doneCount} Done, ${verifiedCount} Verified). ` +
      `Flagged for human review: ${flaggedFiles.length} files: [${flaggedFiles.join(', ')}]`,
    );
  } finally {
    cleanup();
    // Remove listener to avoid double-cleanup
    process.removeListener('exit', cleanup);
  }
}

main().catch((err) => {
  process.stderr.write(`Unhandled error: ${err.message}\n`);
  process.exit(1);
});
