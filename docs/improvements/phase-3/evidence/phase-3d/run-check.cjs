// Verification only: no application edits, live service startup, or database access.
// From repository root: node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs <check>
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error('Git inventory failed');
  return r.stdout;
};
const hash = (file) => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const name = process.argv[2];
if (name === 'snapshot') {
  const files = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  write('initial-file-hashes.json', Object.fromEntries([...new Set(files)].filter(f => fs.existsSync(path.join(root, f))).map(f => [f, hash(f)])));
  fs.writeFileSync(path.join(__dirname, 'git-status-before.txt'), git('status', '--short', '--untracked-files=all'));
  write('environment.json', { at: new Date().toISOString(), node: process.version, platform: process.platform, head: git('rev-parse', 'HEAD').trim() });
  process.exit(0);
}
if (name === 'preservation') {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'initial-file-hashes.json'), 'utf8'));
  const changed = Object.entries(before).filter(([f, h]) => !fs.existsSync(path.join(root, f)) || hash(f) !== h).map(([f]) => f);
  const result = { checked: Object.keys(before).length, changed, at: new Date().toISOString() };
  write('preservation-check.json', result);
  console.log(JSON.stringify(result));
  process.exit(changed.length ? 1 : 0);
}
const checks = {
  typesApi: ['exec', '--workspace=@atlas/api', '--', 'tsc', '--noEmit', '--incremental', 'false', '--pretty', 'false'],
  typesWeb: ['exec', '--workspace=@atlas/web-admin', '--', 'tsc', '--noEmit', '--incremental', 'false', '--pretty', 'false'],
  strictApi: ['exec', '--workspace=@atlas/api', '--', 'tsc', '--noEmit', '--incremental', 'false', '--pretty', 'false', '--strictNullChecks', '--noImplicitAny'],
  lintApi: ['run', 'lint', '--workspace=@atlas/api'],
  lintWeb: ['run', 'lint', '--workspace=@atlas/web-admin'],
  unit: ['run', 'test', '--workspace=@atlas/api', '--', '--runInBand'],
  security: ['run', 'test:security'],
  buildApi: ['run', 'build', '--workspace=@atlas/api'],
  buildWeb: ['run', 'build', '--workspace=@atlas/web-admin'],
};
const npmCli = process.env.npm_execpath || (process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'npm/node_modules/npm/bin/npm-cli.js')
  : path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'));
if (!checks[name] || !fs.existsSync(npmCli)) throw new Error('Use a known check and installed npm CLI');
const env = {
  ...process.env,
  NODE_ENV: name.startsWith('build') ? 'production' : 'test',
  DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/atlas_phase3d_test?schema=public',
  REDIS_URL: 'redis://127.0.0.1:1',
  RABBITMQ_URL: 'amqp://fixture:fixture@127.0.0.1:1',
  API_URL: 'http://127.0.0.1:1/api',
  JWT_SECRET: 'phase3d-test-access-secret-not-production',
  JWT_REFRESH_SECRET: 'phase3d-test-refresh-secret-not-production',
  AUTH_PROXY_SECRET: 'phase3d-test-proxy-secret-not-production',
  STORAGE_ENCRYPTION_KEY: '1'.repeat(64),
  STORAGE_RETENTION_ENABLED: 'false',
  STORAGE_RETENTION_DRY_RUN: 'true',
};
delete env.DATABASE_APP_URL;
const started = Date.now();
const result = spawnSync(process.execPath, [npmCli, ...checks[name]], { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 900000, maxBuffer: 20 * 1024 * 1024 });
const output = (result.stdout || '') + (result.stderr || '');
fs.writeFileSync(path.join(__dirname, `${name}.log`), output);
const summary = { name, command: ['npm', ...checks[name]], node: process.version, exitCode: result.status, error: result.error?.message, durationMs: Date.now() - started, finishedAt: new Date().toISOString() };
if (name === 'strictApi') {
  const diagnostics = [...output.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)].map(m => ({ file: m[1].replaceAll('\\', '/'), line: Number(m[2]), column: Number(m[3]), code: m[4], message: m[5] }));
  summary.diagnostics = diagnostics;
  summary.diagnosticCount = diagnostics.length;
  summary.fileCount = new Set(diagnostics.map(d => d.file)).size;
}
write(`${name}.json`, summary);
console.log(JSON.stringify(summary));
if (result.status !== 0 && name !== 'strictApi') console.log(output.slice(-6000));
process.exitCode = result.status ?? 1;
