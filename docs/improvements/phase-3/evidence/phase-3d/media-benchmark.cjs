// Microbenchmark of current validateUpload implementation, entirely in memory.
// No server, database, real media, thumbnails, or application changes.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const cases = [{ side: 512, format: 'jpeg' }, { side: 2048, format: 'png' }, { side: 4000, format: 'jpeg' }];

async function child(index, concurrency) {
  apiRequire('ts-node').register({ project: path.join(root, 'apps/api/tsconfig.json'), transpileOnly: true });
  const sharp = apiRequire('sharp');
  const { validateUpload } = apiRequire(path.join(root, 'apps/api/src/modules/storage/validate-upload.ts'));
  const { side, format } = cases[index];
  const raw = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const offset = (y * side + x) * 3;
    raw[offset] = x % 256; raw[offset + 1] = y % 256; raw[offset + 2] = (x ^ y) % 256;
  }
  const buffer = await sharp(raw, { raw: { width: side, height: side, channels: 3 } }).toFormat(format).toBuffer();
  const file = { buffer, mimetype: `image/${format}`, originalname: `fixture.${format}`, size: buffer.length };
  for (let i = 0; i < 2; i++) await validateUpload(file);
  const startMemory = process.memoryUsage();
  let peakRss = startMemory.rss;
  const sample = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 10);
  const durations = [];
  const failures = [];
  const total = 12;
  let next = 0;
  let output;
  const cpuStart = process.cpuUsage();
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next++ < total) {
      const start = performance.now();
      try { output = await validateUpload(file); } catch (error) { failures.push(error.message); }
      durations.push(performance.now() - start);
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  }));
  const elapsedMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuStart);
  clearInterval(sample);
  const metadata = output ? await sharp(output).metadata() : {};
  durations.sort((a,b) => a-b);
  const p = n => Number(durations[Math.ceil(total * n) - 1].toFixed(2));
  console.log(JSON.stringify({ side, format, inputBytes: buffer.length, outputBytes: output?.length, outputDimensions: [metadata.width, metadata.height], samples: total, concurrency, failed: failures.length, failures, elapsedMs, operationsPerSecond: total * 1000 / elapsedMs, p50Ms: p(.5), p95Ms: p(.95), p99Ms: p(.99), cpuMs: (cpu.user + cpu.system) / 1000, cpuCoreEquivalentPercent: (cpu.user + cpu.system) / (elapsedMs * 10), baselineRssBytes: startMemory.rss, peakSampledRssBytes: peakRss, lifetimeMaxRssKiB: process.resourceUsage().maxRSS, sharpConcurrency: sharp.concurrency(), sharpCache: sharp.cache(), sharpVersion: sharp.versions.sharp }));
  if (failures.length) process.exitCode = 1;
}
if (process.argv[2] === 'child') child(Number(process.argv[3]), Number(process.argv[4])).catch(error => { console.error(error); process.exitCode = 1; });
else {
  const results = [];
  for (let index = 0; index < cases.length; index++) for (const concurrency of [1, 4]) {
    const run = spawnSync(process.execPath, [__filename, 'child', String(index), String(concurrency)], { encoding: 'utf8', windowsHide: true, timeout: 180000 });
    if (run.status !== 0) throw new Error(`Media benchmark failed: ${run.stderr || run.stdout}`);
    const result = JSON.parse(run.stdout.trim());
    results.push(result);
    console.log(JSON.stringify(result));
  }
  fs.writeFileSync(path.join(__dirname, 'media-benchmark.json'), JSON.stringify({ at: new Date().toISOString(), node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, method: 'Fresh child per case. Deterministic tiled RGB gradient/XOR fixture; highly compressible, not representative photos. Two warmups then 12 samples. CPU is process CPU across threads; RSS includes runtime, raw fixture and libvips cache. Native memory peaks between samples may be missed. p95/p99 both select max at n=12. No upload/network/storage/auth/queue latency. No before/after optimization comparison.', results }, null, 2) + '\n');
}
