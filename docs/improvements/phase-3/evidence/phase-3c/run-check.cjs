// Reproducible local checks against the dedicated atlas-phase3c-review fixture.
// Run via node <this-file> <check>; never reads private env files.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const checks = {
  unit: ['run', 'test:cov', '--workspace=@atlas/api', '--', '--runInBand', '--coverageReporters=json-summary', '--coverageReporters=text'],
  security: ['run', 'test:security'],
  integration: ['run', 'test:int', '--workspace=@atlas/api'],
  e2e: ['run', 'test:e2e', '--workspace=@atlas/api'],
  grants: ['run', 'test:security:db'],
  lint: ['run', 'lint'],
  typesApi: ['exec', '--workspace=@atlas/api', '--', 'tsc', '--noEmit'],
  typesWeb: ['run', 'typecheck', '--workspace=@atlas/web-admin'],
  format: ['run', 'format:check:reliability'],
  audit: ['run', 'audit:dependencies'],
  auditRuntime: ['audit', '--omit=dev', '--audit-level=moderate', '--json'],
  build: ['run', 'build'],
  browser: ['run', 'test:browser'],
};
const name = process.argv[2];
const npmCli = process.env.npm_execpath || (process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'npm/node_modules/npm/bin/npm-cli.js')
  : path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'));
if (!checks[name] || !fs.existsSync(npmCli)) throw new Error('Use a known check name and an installed npm CLI');
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test?schema=public',
  REDIS_URL: 'redis://127.0.0.1:56379',
  RABBITMQ_URL: 'amqp://guest:guest@127.0.0.1:55672',
  QUEUE_NAME: 'phase3c_test_exports',
  JWT_SECRET: 'phase3c-test-access-secret-not-production',
  JWT_REFRESH_SECRET: 'phase3c-test-refresh-secret-not-production',
  AUTH_PROXY_SECRET: 'phase3c-test-proxy-secret-not-production',
  STORAGE_ENCRYPTION_KEY: '1'.repeat(64),
  STORAGE_RETENTION_ENABLED: 'false',
  STORAGE_RETENTION_DRY_RUN: 'true',
  API_URL: 'http://127.0.0.1:4400/api',
  NODE_ENV: name === 'build' ? 'production' : 'test',
};
delete env.DATABASE_APP_URL;
if (['grants', 'browser'].includes(name)) env.DATABASE_APP_URL = 'postgresql://atlas_app:phase3c-test-runtime-password-not-production@127.0.0.1:55432/atlas_test?schema=public';
if (name === 'browser') env.CI = '1';
const started = Date.now();
const result = spawnSync(process.execPath, [npmCli, ...checks[name]], { env, encoding: 'utf8', windowsHide: true, timeout: 900000, maxBuffer: 20 * 1024 * 1024 });
fs.writeFileSync(path.join(__dirname, `${name}.log`), (result.stdout || '') + (result.stderr || ''));
const summary = { name, node: process.version, exitCode: result.status, error: result.error?.message, durationMs: Date.now() - started, finishedAt: new Date().toISOString() };
fs.writeFileSync(path.join(__dirname, `${name}.json`), JSON.stringify(summary, null, 2));
if (name === 'unit' && fs.existsSync('apps/api/coverage/coverage-summary.json')) fs.copyFileSync('apps/api/coverage/coverage-summary.json', path.join(__dirname, 'coverage-after.json'));
console.log(JSON.stringify(summary));
if (result.status !== 0) console.log(((result.stdout || '') + (result.stderr || '')).slice(-6000));
process.exitCode = result.status ?? 1;
