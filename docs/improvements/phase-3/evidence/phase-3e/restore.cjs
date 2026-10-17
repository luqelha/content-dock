// Reuse 3B's production-mode fixture and exact DB/vault/key restore assertions.
// The old Phase 2 reader cannot read 3C per-attempt archives: do not claim rollback verified.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const root = path.resolve(__dirname, "../../../../..");
const filename = path.join(root, "scripts/security/phase3b-drill.cjs");
let source = fs.readFileSync(filename, "utf8");
const start = source.indexOf(
  "  const migrationBefore = databaseManifest(source)._prisma_migrations;",
);
const end = source.indexOf(
  "  const sourceVault = vaultManifest(source);",
  start,
);
if (start < 0 || end < start) throw new Error("Reviewed drill markers changed");
source =
  source.slice(0, start) +
  '  report.unverified = ["Rollback to a previous compatible release was not executed in Phase 3E"];\n' +
  source.slice(end);
const previousStart = source.indexOf("    previous[service] = run([");
const previousEnd = source.indexOf(
  "    assert.match(images[service]",
  previousStart,
);
if (previousStart < 0 || previousEnd < previousStart)
  throw new Error("Previous-image markers changed");
// A restore-only drill has no dependency on old release tags.
source = source.slice(0, previousStart) + source.slice(previousEnd);
source = source.replace(
  "    assert.match(previous[service], /^sha256:[a-f0-9]{64}$/);",
  "",
);
source = source
  .replaceAll(
    "atlas-${service}:phase3b-candidate",
    "atlas-${service}:phase3e-verify",
  )
  .replaceAll("atlas-phase3b-", "atlas-phase3e-")
  .replace(
    "docs/improvements/phase-3/evidence/phase-3b",
    "docs/improvements/phase-3/evidence/phase-3e",
  );
const drill = new Module(filename, module);
drill.filename = filename;
drill.paths = Module._nodeModulePaths(path.dirname(filename));
drill._compile(source, filename);
