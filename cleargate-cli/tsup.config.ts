import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/auth/factory.ts', 'src/auth/token-store.ts', 'src/auth/require-token.ts', 'src/admin-api/index.ts'],
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
