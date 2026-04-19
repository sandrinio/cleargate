/**
 * sha256.test.ts — STORY-009-01
 *
 * Tests every Gherkin scenario for the sha256.ts library.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { hashNormalized, hashFile, shortHash } from '../../src/lib/sha256.js';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sha256-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('hashNormalized', () => {
  it('CRLF collapses to LF before hashing', () => {
    // Gherkin: CRLF normalizes to LF before hashing
    const crlfHash = hashNormalized('foo\r\nbar\r\n');
    const lfHash = hashNormalized('foo\nbar\n');
    expect(crlfHash).toBe(lfHash);
    expect(crlfHash).toHaveLength(64);
  });

  it('leading BOM is stripped before hashing', () => {
    // Gherkin: Leading BOM stripped
    const bomHash = hashNormalized('\ufeffhello\n');
    const plainHash = hashNormalized('hello\n');
    expect(bomHash).toBe(plainHash);
  });

  it('trailing newline is enforced before hashing', () => {
    // Gherkin: Trailing newline enforced
    const withoutNewline = hashNormalized('hello');
    const withNewline = hashNormalized('hello\n');
    expect(withoutNewline).toBe(withNewline);
  });

  it('returns 64 hex characters', () => {
    const result = hashNormalized('test content\n');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('Buffer input is handled the same as string', () => {
    const str = 'hello\nworld\n';
    const buf = Buffer.from(str, 'utf-8');
    expect(hashNormalized(buf)).toBe(hashNormalized(str));
  });

  it('BOM + CRLF + no trailing newline — all three normalizations applied', () => {
    // Cross-platform fixture: Windows-authored file with BOM + CRLF + no trailing \n
    const windowsContent = '\ufeffhello\r\nworld';
    const normalized = hashNormalized('hello\nworld\n');
    expect(hashNormalized(windowsContent)).toBe(normalized);
  });
});

describe('hashFile', () => {
  it('roundtrips through fs — CRLF + BOM file hashes same as normalized string', async () => {
    // Gherkin: hashFile: roundtrips through fs
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'test.txt');
    // Write a file with BOM + CRLF + no trailing newline (Windows-style)
    const windowsContent = '\ufeffhello\r\nworld';
    fs.writeFileSync(filePath, windowsContent, 'utf-8');

    const fileHash = await hashFile(filePath);
    const expectedHash = hashNormalized('hello\nworld\n');
    expect(fileHash).toBe(expectedHash);
  });
});

describe('shortHash', () => {
  it('returns the first 8 hex characters', () => {
    // Gherkin: shortHash: 8 hex chars
    const full = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
    expect(shortHash(full)).toBe('a1b2c3d4');
    expect(shortHash(full)).toHaveLength(8);
  });

  it('works with a real SHA256 hash', () => {
    const full = hashNormalized('hello\n');
    const short = shortHash(full);
    expect(short).toHaveLength(8);
    expect(short).toMatch(/^[0-9a-f]{8}$/);
    expect(full.startsWith(short)).toBe(true);
  });
});
