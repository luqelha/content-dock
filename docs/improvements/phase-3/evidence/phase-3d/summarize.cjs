// Summarize existing evidence. Does not rerun tests or alter application files.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const names = ['typesApi', 'typesWeb', 'strictApi', 'lintApi', 'lintWeb', 'unit', 'security', 'buildApi', 'buildWeb'];
const checks = Object.fromEntries(names.map(name => [name, read(`${name}.json`)]));
const strict = checks.strictApi;
const media = read('media-benchmark.json');
const contract = read('contract-probe.json');
const unitLog = fs.readFileSync(path.join(__dirname, 'unit.log'), 'utf8');
const securityLog = fs.readFileSync(path.join(__dirname, 'security.log'), 'utf8');
const versions = {};
for (const [workspace, packages] of [['api', ['@nestjs/core', '@prisma/client', 'typescript', 'sharp']], ['web-admin', ['next', 'react']]]) {
  const local = createRequire(path.join(root, 'apps', workspace, 'package.json'));
  for (const name of packages) versions[name] = name === 'sharp' ? local('sharp').versions.sharp : local(`${name}/package.json`).version;
}
const summary = {
  at: new Date().toISOString(), scope: 'Verification only; no application optimization or refactor implemented',
  versions, checks,
  tests: {
    unit: Number(unitLog.match(/Tests:\s+(\d+) passed/)?.[1]),
    securityApiSubsetOfUnit: Number(securityLog.match(/Tests:\s+(\d+) passed/)?.[1]),
    securityNode: Number(securityLog.match(/# pass (\d+)/)?.[1]),
  },
  strictness: { flags: ['strictNullChecks', 'noImplicitAny'], diagnostics: strict.diagnosticCount, files: strict.fileCount, source: strict.diagnostics.filter(d => d.file.startsWith('src/')).length, tests: strict.diagnostics.filter(d => d.file.startsWith('test/')).length, fullStrictMigrationMeasured: false },
  media: { conditions: media.results.length, operations: media.results.reduce((n,r) => n+r.samples,0), failed: media.results.reduce((n,r) => n+r.failed,0), endToEndHttp: false },
  contracts: { contentListHasResponseSchema: contract.contentListHasResponseSchema, mediaListHasResponseSchema: contract.mediaListHasResponseSchema, prismaStub: true },
  runtime: read('runtime-target.json'), preservation: read('preservation-check.json'),
  notRerun: ['HTTP load benchmark', 'integration', 'API E2E', 'browser', 'coverage', 'database grants', 'recovery drill', 'runtime dependency audit', 'container image build', 'remote CI'],
};
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
const files = [
  path.join(__dirname, '../../PHASE-3D-VERIFICATION.md'),
  path.join(__dirname, '../../PERFORMANCE-REPORT.md'),
  ...fs.readdirSync(__dirname).filter(name => name !== 'changed-files.json').map(name => path.join(__dirname, name)),
];
const entries = files.filter(file => fs.statSync(file).isFile()).map(file => ({
  file: path.relative(root, file).replaceAll('\\', '/'), change: 'added by Phase 3D verification',
  sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'), localIgnoredLog: file.endsWith('.log'),
}));
fs.writeFileSync(path.join(__dirname, 'changed-files.json'), JSON.stringify({ at: new Date().toISOString(), note: 'Manifest excludes its own hash. Application/config/dependency/migration changes: none.', files: entries }, null, 2) + '\n');
console.log(JSON.stringify({ versions, tests: summary.tests, strictness: summary.strictness, media: summary.media, preservation: summary.preservation, artifactFiles: entries.length }));
