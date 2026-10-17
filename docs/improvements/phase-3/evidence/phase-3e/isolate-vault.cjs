// E2E only, runInBand: each suite uses a fresh synthetic vault outside user storage.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "atlas-phase3e-e2e-")));
