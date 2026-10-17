const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { reviewLifecycle } = require("./lifecycle-policy.cjs");

const root = path.resolve(__dirname, "../..");
process.chdir(root);
const policy = require("../../ops/maintenance/dependency-lifecycle.json");
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const now = new Date();
const failures = reviewLifecycle(policy, process.versions.node, now);
const direct = Object.entries(lock.packages)
  .filter(([location]) => ["", "apps/api", "apps/web-admin"].includes(location))
  .flatMap(([workspace, pkg]) =>
    ["dependencies", "devDependencies"].flatMap((kind) =>
      Object.entries(pkg[kind] || {}).map(([name, range]) => {
        const nested =
          workspace && lock.packages[`${workspace}/node_modules/${name}`];
        const installed = nested || lock.packages[`node_modules/${name}`];
        if (!installed)
          failures.push(
            `Missing locked direct dependency: ${workspace || "."}/${name}`,
          );
        return {
          workspace: workspace || ".",
          kind,
          name,
          range,
          version: installed?.version,
          deprecated: installed?.deprecated || null,
          engines: installed?.engines || null,
        };
      }),
    ),
  );
const deprecated = Object.entries(lock.packages)
  .filter(([, pkg]) => pkg.deprecated)
  .map(([location, pkg]) => ({
    location,
    version: pkg.version,
    dev: pkg.dev === true,
    reason: pkg.deprecated,
  }));
const report = {
  generatedAt: now.toISOString(),
  lockSha256: createHash("sha256")
    .update(fs.readFileSync("package-lock.json"))
    .digest("hex"),
  node: process.versions.node,
  policy,
  direct,
  deprecated,
  failures,
  registry: { status: "not-requested" },
};
if (process.argv.includes("--outdated")) {
  if (!process.env.npm_execpath)
    throw Error("Run through npm run maintenance:dependencies:registry");
  const result = spawnSync(
    process.execPath,
    [
      process.env.npm_execpath,
      "outdated",
      "--json",
      "--long",
      "--workspaces",
      "--include-workspace-root",
      "--fetch-retries=0",
      "--fetch-timeout=30000",
    ],
    {
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );
  try {
    if (result.error || ![0, 1].includes(result.status))
      throw Error("Registry query did not complete");
    const outdated = JSON.parse(result.stdout || "{}");
    if (
      outdated.error ||
      typeof outdated !== "object" ||
      Array.isArray(outdated)
    )
      throw Error("Invalid registry report");
    report.registry = { status: "available", outdated };
  } catch {
    report.registry = { status: "unavailable" };
    failures.push(
      "Registry lifecycle lookup unavailable; no current-version claim can be made",
    );
  }
}
fs.mkdirSync("artifacts/maintenance", { recursive: true });
fs.writeFileSync(
  "artifacts/maintenance/dependency-lifecycle.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      directDependencies: direct.length,
      deprecatedPaths: deprecated.length,
      registry: report.registry.status,
      reviewBy: policy.reviewBy,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
