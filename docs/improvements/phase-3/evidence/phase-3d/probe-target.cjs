// Read-only availability check. Does not provision, restart, or change a service.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
async function main() {
  const docker = spawnSync('docker', ['ps', '--format', '{{.Names}}|{{.Status}}|{{.Ports}}'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  let health;
  try {
    const response = await fetch('http://127.0.0.1:4400/api/health', { signal: AbortSignal.timeout(5000), redirect: 'error' });
    const body = await response.json();
    health = { reachable: true, status: response.status, environment: body.environment, testDatabase: body.testDatabase };
  } catch (error) { health = { reachable: false, error: error.message, code: error.cause?.code }; }
  const result = { at: new Date().toISOString(), dockerExitCode: docker.status, containers: (docker.stdout || '').trim().split('\n').filter(Boolean), target: 'http://127.0.0.1:4400/api/health', health, httpBenchmarkExecuted: false };
  fs.writeFileSync(path.join(__dirname, 'runtime-target.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
