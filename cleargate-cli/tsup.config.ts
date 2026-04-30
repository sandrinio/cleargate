import { defineConfig } from 'tsup';
import * as fs from 'node:fs';
import * as path from 'node:path';

function copyDirSync(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

export default defineConfig({
  entry: ['src/cli.ts', 'src/auth/factory.ts', 'src/auth/token-store.ts', 'src/auth/require-token.ts', 'src/admin-api/index.ts', 'src/lib/ledger.ts'],
  format: ['esm', 'cjs'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  shims: true,
  clean: true,
  sourcemap: true,
  target: 'node24',
  dts: true,
  async onSuccess() {
    // Copy non-TS assets (templates) to dist/ so they are accessible at runtime.
    // tsup does not copy non-TS files by default (see flashcard #tsup #npm-publish #assets).
    const pkgRoot = new URL('.', import.meta.url).pathname;
    const srcTemplates = path.join(pkgRoot, 'templates');
    const dstTemplates = path.join(pkgRoot, 'dist', 'templates');
    if (fs.existsSync(srcTemplates)) {
      copyDirSync(srcTemplates, dstTemplates);
      console.log('tsup onSuccess: templates copied to dist/templates/');
    }

    // Copy MANIFEST.json to dist/ so it ships with the npm package.
    // prebuild generates cleargate-planning/MANIFEST.json; we propagate it here.
    // dist/ is already in package.json files[], so no files[] change needed.
    const metaRoot = path.resolve(pkgRoot, '..');
    const srcManifest = path.join(metaRoot, 'cleargate-planning', 'MANIFEST.json');
    const dstManifest = path.join(pkgRoot, 'dist', 'MANIFEST.json');
    if (fs.existsSync(srcManifest)) {
      fs.copyFileSync(srcManifest, dstManifest);
      console.log('tsup onSuccess: MANIFEST.json copied to dist/MANIFEST.json');
    } else {
      console.warn('tsup onSuccess: cleargate-planning/MANIFEST.json not found — run npm run build to generate it');
    }
  },
});
