import { build } from 'esbuild';

build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/api/index.js',
  external: [
    // Keep these as external since they're in node_modules
    'express',
    '@trpc/*',
    'mysql2',
    'drizzle-orm',
    'google-auth-library',
    'aws-sdk',
    'replicate',
    'axios',
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  }
}).catch(() => process.exit(1));

