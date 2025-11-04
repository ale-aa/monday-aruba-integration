const { spawnSync } = require('child_process');
const { mkdirSync } = require('fs');
const path = require('path');

// Store Prisma engine binaries inside the project to avoid permission issues on global cache dirs
const cacheRoot = path.resolve(__dirname, '..', '.cache');
const cacheDir = path.join(cacheRoot, 'prisma');
mkdirSync(cacheDir, { recursive: true });

const prismaBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
);

const env = {
  ...process.env,
  XDG_CACHE_HOME: cacheRoot,
  PRISMA_ENGINE_CACHE_DIR: cacheDir,
  PRISMA_CLI_ENGINE_BINARY_CACHE_DIR: cacheDir
};

const result = spawnSync(prismaBin, ['generate'], {
  stdio: 'inherit',
  env
});

if (result.error) {
  console.error('[prisma-generate] Failed to execute Prisma CLI:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
