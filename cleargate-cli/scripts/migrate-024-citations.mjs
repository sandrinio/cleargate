#!/usr/bin/env node
/**
 * STORY-024-02: Protocol split + full citation rewrite
 *
 * § mapping: {15→1, 16→2, 17→3, 18→4, 19→5, 20→6, 22→7, 23→8, 24→9, 25→10, 26→11, 27→12}
 *
 * This script is NOT committed as a permanent CLI surface — it is a one-time migration helper.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

// § mapping: old section number → new section number
const SECTION_MAP = { 15: 1, 16: 2, 17: 3, 18: 4, 19: 5, 20: 6, 22: 7, 23: 8, 24: 9, 25: 10, 26: 11, 27: 12 };
const MOVED_SECTIONS = new Set(Object.keys(SECTION_MAP).map(Number));
const MOVED_PATTERN = /§(15|16|17|18|19|20|22|23|24|25|26|27)(\.\d+)?/;

// Track changed files for self-amend
const changedFiles = new Set();
const substitutionLog = [];

function log(msg) { console.log(msg); }

// ============================================================================
// Utility: protect spec-frozen phrases, renumber, restore
// ============================================================================

function renumberMovedRefs(text) {
  // Protect "protocol §20.1 option 2" and "protocol §20.1" — spec-frozen commit-message strings
  const markers = [];
  let result = text;
  result = result.replace(/protocol §20\.1 option 2/g, m => { const k = `__P${markers.length}__`; markers.push(m); return k; });
  result = result.replace(/protocol §20\.1\b/g, m => { const k = `__P${markers.length}__`; markers.push(m); return k; });

  // Renumber §(15|16|17|18|19|20|22|23|24|25|26|27)(\.\d+)?
  result = result.replace(/§(15|16|17|18|19|20|22|23|24|25|26|27)(\.\d+)?/g, (_, sec, sub) => {
    return `§${SECTION_MAP[parseInt(sec, 10)]}${sub || ''}`;
  });

  // Restore
  markers.forEach((orig, i) => { result = result.replace(`__P${i}__`, orig); });
  return result;
}

// ============================================================================
// Phase 1: Create cleargate-enforcement.md
// ============================================================================

function phase1() {
  log('\n=== Phase 1: Creating cleargate-enforcement.md ===');

  const protocolPath = join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
  const content = readFileSync(protocolPath, 'utf-8');
  const lines = content.split('\n');

  // Find all ## N. section headings
  const sectionStarts = {};
  const sectionTitles = {};
  lines.forEach((line, idx) => {
    const m = line.match(/^## (\d+)\. (.+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      sectionStarts[n] = idx;
      sectionTitles[n] = m[2];
    }
  });

  const allSections = Object.keys(sectionStarts).map(Number).sort((a, b) => a - b);
  log(`Sections in protocol: ${allSections.join(', ')}`);

  // Extract a section's lines (from heading to just before the --- separator of next section)
  function extractSectionLines(num) {
    const startIdx = sectionStarts[num];
    const sectionPos = allSections.indexOf(num);
    let endIdx;

    if (sectionPos === allSections.length - 1) {
      endIdx = lines.length;
    } else {
      const nextNum = allSections[sectionPos + 1];
      const nextStart = sectionStarts[nextNum];
      // End just before the next section; trim trailing empty lines and ---
      endIdx = nextStart;
      while (endIdx > startIdx && (lines[endIdx - 1] === '' || lines[endIdx - 1] === '---')) {
        endIdx--;
      }
    }

    return lines.slice(startIdx, endIdx);
  }

  const sectionsToMove = [15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27];

  // Build index table
  const indexRows = sectionsToMove.map(oldNum =>
    `| §${SECTION_MAP[oldNum]} | protocol §${oldNum} | ${sectionTitles[oldNum]} |`
  );

  let enforcement = `# ClearGate Enforcement\n\nHook-enforced rules surfaced by CLI errors. AI agents read this file when a hook trips, not at session start. Source split from \`cleargate-protocol.md\` per EPIC-024 (2026-04-30).\n\n## Index\n\n| New § | Source § | Title |\n|---|---|---|\n${indexRows.join('\n')}\n\n---\n\n`;

  for (const oldNum of sectionsToMove) {
    const newNum = SECTION_MAP[oldNum];
    const sectionLines = extractSectionLines(oldNum);
    let sectionText = sectionLines.join('\n');

    // Rename subsection headings FIRST: ### §15.X → ### §1.X
    // (must happen before renumberMovedRefs so the pattern matches old numbers)
    sectionText = sectionText.replace(
      new RegExp(`### §${oldNum}\\.(\\d+)`, 'g'),
      `### §${newNum}.$1`
    );

    // Renumber internal cross-references to other moved sections
    // (runs before heading annotation is added, so the annotation is safe)
    sectionText = renumberMovedRefs(sectionText);

    // Now rename the main heading: ## 15. Foo (v2) → ## 1. Foo (v2) (source: protocol §15)
    // At this point §15 in the body is already renumbered; only the heading number remains
    sectionText = sectionText.replace(
      new RegExp(`^## ${oldNum}\\. (.+)`, 'm'),
      `## ${newNum}. $1 (source: protocol §${oldNum})`
    );

    enforcement += sectionText + '\n\n---\n\n';
  }

  // Trim final trailing ---
  enforcement = enforcement.replace(/\n\n---\n\n$/, '\n');

  const livePath = join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-enforcement.md');
  const canonPath = join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-enforcement.md');

  writeFileSync(livePath, enforcement, 'utf-8');
  writeFileSync(canonPath, enforcement, 'utf-8');
  changedFiles.add(livePath);
  changedFiles.add(canonPath);
  log(`Written: ${livePath}`);
  log(`Written (mirror): ${canonPath}`);
}

// ============================================================================
// Phase 2: Slim cleargate-protocol.md
// ============================================================================

function phase2() {
  log('\n=== Phase 2: Slimming cleargate-protocol.md ===');

  const protocolPath = join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
  const content = readFileSync(protocolPath, 'utf-8');
  const lines = content.split('\n');

  // Find all section boundaries
  const sectionStarts = {};
  lines.forEach((line, idx) => {
    const m = line.match(/^## (\d+)\. /);
    if (m) sectionStarts[parseInt(m[1], 10)] = idx;
  });

  const allSections = Object.keys(sectionStarts).map(Number).sort((a, b) => a - b);
  const sectionsToRemove = new Set([15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27]);

  // Mark lines to remove
  const removeLines = new Set();

  for (let i = 0; i < allSections.length; i++) {
    const num = allSections[i];
    if (!sectionsToRemove.has(num)) continue;

    const sectionStart = sectionStarts[num];

    // End of section: either start of next section - 1, or end of file
    let sectionEnd;
    if (i === allSections.length - 1) {
      sectionEnd = lines.length - 1;
    } else {
      const nextNum = allSections[i + 1];
      sectionEnd = sectionStarts[nextNum] - 1;
    }

    // Include the --- separator before this section (look back from sectionStart)
    let actualStart = sectionStart;
    let lb = sectionStart - 1;
    // Skip empty lines
    while (lb >= 0 && lines[lb] === '') lb--;
    if (lb >= 0 && lines[lb] === '---') {
      // Include the --- and empty lines before it
      actualStart = lb;
      let lb2 = lb - 1;
      while (lb2 >= 0 && lines[lb2] === '') {
        lb2--;
      }
      // Keep lb2+1 as the true start (first empty line before ---)
      // But don't go too far back - just mark from actualStart
    }

    for (let j = actualStart; j <= sectionEnd; j++) {
      removeLines.add(j);
    }
  }

  const newLines = lines.filter((_, idx) => !removeLines.has(idx));

  // Clean up: collapse 3+ consecutive empty lines to 2
  const slim = [];
  let emptyCount = 0;
  for (const line of newLines) {
    if (line === '') {
      emptyCount++;
      if (emptyCount <= 2) slim.push(line);
    } else {
      emptyCount = 0;
      slim.push(line);
    }
  }

  // Ensure single trailing newline
  const slimContent = slim.join('\n').replace(/\n+$/, '') + '\n';

  const lineCount = slimContent.split('\n').length;
  log(`Slim protocol: ${lineCount} lines (was 1088)`);

  const livePath = join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
  const canonPath = join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md');

  writeFileSync(livePath, slimContent, 'utf-8');
  writeFileSync(canonPath, slimContent, 'utf-8');
  changedFiles.add(livePath);
  changedFiles.add(canonPath);
  log(`Written: ${livePath}`);
  log(`Written (mirror): ${canonPath}`);

  return lineCount;
}

// ============================================================================
// Phase 3: Citation rewrite across all surfaces
// ============================================================================

function isArchivePath(filePath) {
  return filePath.includes('/delivery/archive/');
}

function rewriteLineForCitations(line, filePath) {
  // Skip frontmatter lines in archive files
  if (isArchivePath(filePath) && /^[a-z_]+:/.test(line)) {
    return { line, changed: false };
  }

  // Skip if no moved-section reference
  if (!MOVED_PATTERN.test(line)) {
    return { line, changed: false };
  }

  // False positive guard: architect.md line with illustrative "next free after §20" or "stale, rewritten to §21"
  // These are pedagogical examples in the Numbering Resolver, not real citations
  if ((line.includes('next free after') && /§(20|21)/.test(line)) ||
      line.includes('stale, rewritten to §') ||
      line.includes('max = 20')) {
    return { line, changed: false };
  }

  // Protect spec-frozen phrases, renumber, restore filename if needed
  const markers = [];
  let result = line;

  // Protect "protocol §20.1 option 2"
  result = result.replace(/protocol §20\.1 option 2/g, m => { const k = `__P${markers.length}__`; markers.push(m); return k; });
  // Protect "protocol §20.1" standalone
  result = result.replace(/protocol §20\.1\b/g, m => { const k = `__P${markers.length}__`; markers.push(m); return k; });

  // Check if the original (unprotected) line had moved-§ refs beyond the protected regions
  const testLine = line.replace(/protocol §20\.1/g, '');
  const hadMovedRef = MOVED_PATTERN.test(testLine);

  // Renumber
  result = result.replace(/§(15|16|17|18|19|20|22|23|24|25|26|27)(\.\d+)?/g, (_, sec, sub) => {
    return `§${SECTION_MAP[parseInt(sec, 10)]}${sub || ''}`;
  });

  // Rename cleargate-protocol.md → cleargate-enforcement.md if this line had moved-§ refs
  // and references the filename
  if (hadMovedRef && result.includes('cleargate-protocol.md')) {
    result = result.replace(/cleargate-protocol\.md/g, 'cleargate-enforcement.md');
  }

  // Restore
  markers.forEach((orig, i) => { result = result.replace(`__P${i}__`, orig); });

  const changed = result !== line;
  return { line: result, changed };
}

function processFile(filePath) {
  // Skip the enforcement file itself (already has new numbers from Phase 1)
  if (filePath.includes('cleargate-enforcement.md')) return;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let hasChanges = false;
  const newLines = lines.map((line, idx) => {
    const { line: newLine, changed } = rewriteLineForCitations(line, filePath);
    if (changed) {
      substitutionLog.push({ file: filePath, line: idx + 1, before: line, after: newLine });
      hasChanges = true;
    }
    return newLine;
  });

  if (hasChanges) {
    writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    changedFiles.add(filePath);
    return true;
  }
  return false;
}

function walkDir(dir, skipPatterns = []) {
  const results = [];
  if (!existsSync(dir)) return results;
  const stat = statSync(dir);
  if (stat.isFile()) { results.push(dir); return results; }

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipPatterns.some(p => full.includes(p))) {
        results.push(...walkDir(full, skipPatterns));
      }
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function phase3() {
  log('\n=== Phase 3: Citation rewrite across all surfaces ===');

  const skipPatterns = ['sprint-runs'];
  const surfaceDirs = [
    join(REPO_ROOT, '.cleargate', 'delivery'),
    join(REPO_ROOT, '.claude', 'agents'),
    join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents'),
    join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'templates'),
    join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts'),
    join(REPO_ROOT, '.cleargate', 'wiki'),
  ];
  const surfaceFiles = [
    join(REPO_ROOT, 'CLAUDE.md'),
    join(REPO_ROOT, 'cleargate-planning', 'CLAUDE.md'),
  ];

  const allFiles = new Set();
  for (const dir of surfaceDirs) {
    for (const f of walkDir(dir, skipPatterns)) allFiles.add(f);
  }
  for (const f of surfaceFiles) {
    if (existsSync(f)) allFiles.add(f);
  }

  log(`Processing ${allFiles.size} files...`);
  let modified = 0;
  for (const f of allFiles) {
    if (processFile(f)) {
      log(`  Modified: ${f.replace(REPO_ROOT + '/', '')}`);
      modified++;
    }
  }
  log(`Phase 3 done: ${modified} files modified, ${substitutionLog.length} substitutions`);
}

// ============================================================================
// Phase 4: architect.md line-cap rewrite
// ============================================================================

function phase4() {
  log('\n=== Phase 4: Rewriting architect.md line-cap bullet ===');

  const OLD = `- **Small plans.** A 200-line plan is a bad plan. Target 60-120 lines per milestone. If a milestone needs more, it's over-scoped — flag that.`;
  const NEW = `- **Plan length is scope-driven.** No line cap. The reform from EPIC-024 was to drop §3.1 duplication, not to compress.`;

  const paths = [
    join(REPO_ROOT, '.claude', 'agents', 'architect.md'),
    join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'architect.md'),
  ];

  for (const p of paths) {
    if (!existsSync(p)) { log(`Not found: ${p}`); continue; }
    const content = readFileSync(p, 'utf-8');
    if (!content.includes(OLD)) {
      log(`WARNING: old bullet not found in ${p}`);
      continue;
    }
    writeFileSync(p, content.replace(OLD, NEW), 'utf-8');
    changedFiles.add(p);
    log(`Modified: ${p.replace(REPO_ROOT + '/', '')}`);
  }
}

// ============================================================================
// MANIFEST update
// ============================================================================

function computeSha256(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const normalized = content.replace(/\r\n/g, '\n').replace(/\n$/, '') + '\n';
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

function updateManifest() {
  log('\n=== Updating MANIFEST.json ===');

  const manifestPath = join(REPO_ROOT, 'cleargate-planning', 'MANIFEST.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  const enforcementCanon = join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-enforcement.md');
  const protocolCanon = join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md');

  const enforcementSha = computeSha256(enforcementCanon);
  const protocolSha = computeSha256(protocolCanon);

  log(`Protocol SHA256: ${protocolSha}`);
  log(`Enforcement SHA256: ${enforcementSha}`);

  // Update protocol sha256
  const protoEntry = manifest.files.find(f => f.path === '.cleargate/knowledge/cleargate-protocol.md');
  if (protoEntry) {
    protoEntry.sha256 = protocolSha;
    log(`Updated cleargate-protocol.md sha256`);
  }

  // Insert enforcement entry after protocol entry if not present
  const existingEnforcement = manifest.files.find(f => f.path === '.cleargate/knowledge/cleargate-enforcement.md');
  if (!existingEnforcement) {
    const protoIdx = manifest.files.findIndex(f => f.path === '.cleargate/knowledge/cleargate-protocol.md');
    manifest.files.splice(protoIdx + 1, 0, {
      path: '.cleargate/knowledge/cleargate-enforcement.md',
      sha256: enforcementSha,
      tier: 'protocol',
      overwrite_policy: 'merge-3way',
      preserve_on_uninstall: false
    });
    log(`Inserted cleargate-enforcement.md into MANIFEST`);
  } else {
    existingEnforcement.sha256 = enforcementSha;
    log(`Updated cleargate-enforcement.md sha256`);
  }

  const newContent = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(manifestPath, newContent, 'utf-8');
  changedFiles.add(manifestPath);
  log(`Written: ${manifestPath.replace(REPO_ROOT + '/', '')}`);
}

// ============================================================================
// Self-amend STORY-024-02 §3.1
// ============================================================================

function selfAmendStory() {
  log('\n=== Self-amending STORY-024-02 §3.1 ===');

  const storyPath = join(REPO_ROOT, '.cleargate', 'delivery', 'pending-sync', 'STORY-024-02_Protocol_Split_And_Citation_Rewrite.md');
  const content = readFileSync(storyPath, 'utf-8');

  // Collect and sort all changed files (relative to repo root)
  const relFiles = [...changedFiles].sort().map(f => f.replace(REPO_ROOT + '/', ''));

  // Self-amendment block
  const block = `
### 3.1 Concrete Citation-Rewrite File List (self-amended per protocol §20.1 option 2)

Files staged in this commit (grep-derived, deduped, sorted):

| File | Role |
|---|---|
${relFiles.map(f => `| \`${f}\` | citation-rewrite surface |`).join('\n')}
`;

  // Append before the closing ClearGate Ambiguity Gate section
  const insertMarker = '\n---\n\n## ClearGate Ambiguity Gate';
  const idx = content.indexOf(insertMarker);

  let newContent;
  if (idx !== -1) {
    newContent = content.slice(0, idx) + block + content.slice(idx);
  } else {
    // Fallback: append at end
    newContent = content + block;
  }

  writeFileSync(storyPath, newContent, 'utf-8');
  changedFiles.add(storyPath);
  log(`Self-amended: ${storyPath.replace(REPO_ROOT + '/', '')}`);
}

// ============================================================================
// Verification
// ============================================================================

function verify() {
  log('\n=== Verification ===');

  // Check cleargate-enforcement.md exists at both paths
  const livePath = join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-enforcement.md');
  const canonPath = join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-enforcement.md');
  log(`  enforcement live: ${existsSync(livePath) ? 'OK' : 'MISSING'}`);
  log(`  enforcement canon: ${existsSync(canonPath) ? 'OK' : 'MISSING'}`);

  // Check slim protocol line count
  const slimProtocol = readFileSync(join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md'), 'utf-8');
  const slimLineCount = slimProtocol.split('\n').length;
  log(`  slim protocol lines: ${slimLineCount} (≤500? ${slimLineCount <= 500 ? 'YES' : 'NO'})`);

  // Check no ## 15-20, 22-27 headings in slim protocol
  const hasRemovedHeadings = /^## (15|16|17|18|19|20|22|23|24|25|26|27)\b/m.test(slimProtocol);
  log(`  no removed headings in slim protocol: ${hasRemovedHeadings ? 'FAIL' : 'OK'}`);

  // Check mirror parity
  const slimLive = readFileSync(join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md'), 'utf-8');
  const slimCanon = readFileSync(join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md'), 'utf-8');
  log(`  protocol mirror parity: ${slimLive === slimCanon ? 'OK' : 'FAIL'}`);

  const enfLive = readFileSync(livePath, 'utf-8');
  const enfCanon = readFileSync(canonPath, 'utf-8');
  log(`  enforcement mirror parity: ${enfLive === enfCanon ? 'OK' : 'FAIL'}`);

  // Check architect.md line-cap
  const archLive = readFileSync(join(REPO_ROOT, '.claude', 'agents', 'architect.md'), 'utf-8');
  const archCanon = readFileSync(join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'architect.md'), 'utf-8');
  const hasOldBullet = archLive.includes('Small plans.') && archLive.includes('200-line');
  log(`  architect line-cap removed: ${hasOldBullet ? 'FAIL' : 'OK'}`);
  log(`  architect mirror parity: ${archLive === archCanon ? 'OK' : 'FAIL'}`);
}

// ============================================================================
// Main
// ============================================================================

phase1();
phase2();
phase3();
phase4();
updateManifest();
selfAmendStory();
verify();

log('\n=== Done ===');
log(`Total files changed: ${changedFiles.size}`);
log(`Total substitutions: ${substitutionLog.length}`);
const sortedChanged = [...changedFiles].sort();
log('\nFiles changed:');
sortedChanged.forEach(f => log(`  ${f.replace(REPO_ROOT + '/', '')}`));
