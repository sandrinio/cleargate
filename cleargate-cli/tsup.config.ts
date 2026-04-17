import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm', 'cjs'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  shims: true,
  clean: true,
  sourcemap: true,
  target: 'node24',
  dts: true,
});
