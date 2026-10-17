// Reuse reviewed 3C drill with only fixture identity / synthetic credentials / evidence destination changed.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../../../..");
const saved = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixture.json"), "utf8"),
);
for (const fixture of saved) {
  const [actual] = JSON.parse(
    spawnSync("docker", ["inspect", fixture.id], {
      encoding: "utf8",
      windowsHide: true,
    }).stdout,
  );
  if (
    actual.Id !== fixture.id ||
    actual.Config.Labels["com.docker.compose.project"] !==
      "atlas-phase3e-review"
  )
    throw new Error("Fixture mismatch");
}
const filename = path.join(root, "scripts/security/phase3c-recovery.cjs");
const source = fs
  .readFileSync(filename, "utf8")
  .replaceAll("phase3c", "phase3e")
  .replaceAll("phase-3c", "phase-3e");
const drill = new Module(filename, module);
drill.filename = filename;
drill.paths = Module._nodeModulePaths(path.dirname(filename));
drill._compile(source, filename);
