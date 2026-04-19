#!/usr/bin/env node
/**
 * copy-planning-payload.mjs — prebuild script
 *
 * Copies meta-root cleargate-planning/ → cleargate-cli/templates/cleargate-planning/
 * Idempotent: removes destination before copying.
 *
 * Usage: node scripts/copy-planning-payload.mjs
 * Run via: npm run prebuild
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// cleargate-cli/scripts/ → cleargate-cli/ → meta-root/
const pkgRoot = path.resolve(__dirname, '..');
const metaRoot = path.resolve(pkgRoot, '..');

const src = path.join(metaRoot, 'cleargate-planning');
const dst = path.join(pkgRoot, 'templates', 'cleargate-planning');

if (!fs.existsSync(src)) {
  console.error(`[prebuild] ERROR: source not found: ${src}`);
  process.exit(1);
}

// Remove destination for clean copy
if (fs.existsSync(dst)) {
  fs.rmSync(dst, { recursive: true, force: true });
}

// Ensure templates/ directory exists
fs.mkdirSync(path.join(pkgRoot, 'templates'), { recursive: true });

// Recursive copy
function copyDir(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

copyDir(src, dst);

// Count copied files
let count = 0;
function countFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
}
countFiles(dst);

console.log(`[prebuild] cleargate-planning payload copied: ${count} files → ${dst}`);
