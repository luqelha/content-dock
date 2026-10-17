// Keep CI traces with synthetic session tokens outside the repository.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const output = path.join(__dirname, "revision-3", "artifact-download.json");
const report = {
  startedAt: new Date().toISOString(),
  runId: 38725529650,
  artifactId: 11968077548,
  expectedSha256:
    "b18c9d20a22ced358cc50b95baf2344f81d1bedbeba61e2b84b446e4afd93427",
};
async function main() {
  const credentials = cp.spawnSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
  });
  const token = credentials.stdout
    ?.split(/\r?\n/)
    .find((l) => l.startsWith("password="))
    ?.slice(9);
  if (!token) throw Error("Credential unavailable");
  const response = await fetch(
    `https://api.github.com/repos/luqelha/atlas-platform/actions/artifacts/${report.artifactId}/zip`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "atlas-phase3f-evidence",
        Authorization: `Bearer ${token}`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    },
  );
  const location = response.headers.get("location");
  const download = location
    ? await fetch(location, { signal: AbortSignal.timeout(90000) })
    : response;
  if (!download.ok) throw Error(`Artifact HTTP ${download.status}`);
  const data = Buffer.from(await download.arrayBuffer());
  report.sha256 = crypto.createHash("sha256").update(data).digest("hex");
  if (report.sha256 !== report.expectedSha256)
    throw Error("Artifact digest mismatch");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-phase3f-artifact-"));
  report.file = path.join(dir, "validation-results.zip");
  fs.writeFileSync(report.file, data);
  Object.assign(report, {
    status: "downloaded",
    bytes: data.length,
    digestMatchesGitHub: true,
    privateArchive: true,
  });
}
main()
  .catch((error) => {
    report.status = "unavailable";
    report.error = {
      name: error.name,
      code: error.cause?.code,
      message: error.message,
    };
    process.exitCode = 1;
  })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
  });
