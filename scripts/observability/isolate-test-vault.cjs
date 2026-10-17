// Jest setup only: never let E2E storage fixtures use a developer's existing vault.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "atlas-phase4a-e2e-")));
