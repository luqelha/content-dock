// Prepare a candidate with an alternate index; the user's branch/index stay intact.
const fs = require("node:fs");
const cp = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../../../..");
process.chdir(root);
const revision = process.argv[3];
if (revision && !/^[2-9][0-9]*$/.test(revision))
  throw Error("Invalid revision");
const output = revision
  ? path.join(__dirname, `revision-${revision}`)
  : __dirname;
fs.mkdirSync(output, { recursive: true });
const manifestPath = path.join(output, "candidate.json");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const env = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GCM_INTERACTIVE: "Never",
};
function git(args, input, extraEnv = {}) {
  const r = cp.spawnSync("git", args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    input,
    encoding: "utf8",
    timeout: 90000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.status !== 0) {
    const e = Error(`git ${args[0]} failed`);
    e.exitCode = r.status;
    throw e;
  }
  return r.stdout.trim();
}
function save(file, data) {
  fs.writeFileSync(
    path.join(output, file),
    JSON.stringify(data, null, 2) + "\n",
  );
}
function prepare() {
  if (fs.existsSync(manifestPath))
    throw Error("Candidate exists; do not overwrite evidence");
  const originalHead = git(["rev-parse", "HEAD"]);
  const parentCommit = revision
    ? JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            ...(revision === "2" ? [] : [`revision-${Number(revision) - 1}`]),
            "candidate.json",
          ),
        ),
      ).commit
    : originalHead;
  const originalBranch = git(["branch", "--show-current"]);
  const indexPath = git(["rev-parse", "--git-path", "index"]);
  const indexHash = hash(fs.readFileSync(indexPath));
  const privateDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "atlas-phase3f-index-"),
  );
  const alt = { GIT_INDEX_FILE: path.join(privateDir, "index") };
  git(["read-tree", parentCommit], undefined, alt);
  const exclusions = [
    ".audit-artifacts",
    "artifacts",
    "docs/improvements/phase-3/evidence",
  ];
  git(
    [
      "-c",
      "core.safecrlf=false",
      "add",
      "-A",
      "--",
      ".",
      ...exclusions.map((p) => `:(exclude)${p}`),
    ],
    undefined,
    alt,
  );
  const names = git(["ls-files", "-z"], undefined, alt)
    .split("\0")
    .filter(Boolean);
  const forbidden = names.filter(
    (name) =>
      (/(^|\/)\.env($|\.)/.test(name) && !name.endsWith(".example")) ||
      /\.(pem|key|pfx|p12|dump|enc|tar|tgz)$/i.test(name) ||
      /(^|\/)\.development-key$/.test(name),
  );
  if (forbidden.length) throw Error("Candidate contains secret/backup paths");
  const tree = git(["write-tree"], undefined, alt);
  const changed = git(
    ["diff", "--cached", "--name-only", "-z", "HEAD"],
    undefined,
    alt,
  )
    .split("\0")
    .filter(Boolean);
  const secretFindings = [];
  for (const name of names) {
    const content = git(["show", `:${name}`], undefined, alt);
    if (
      /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/.test(
        content,
      )
    )
      secretFindings.push(name);
  }
  if (secretFindings.length)
    throw Error("Candidate contains credential patterns");
  const commit = git(
    ["commit-tree", tree, "-p", parentCommit],
    "ci: validate Phase 3F release candidate\n",
    alt,
  );
  const branch = `release/phase-3f-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  const blobs = git(["ls-tree", "-r", tree])
    .split("\n")
    .map((line) => {
      const [meta, name] = line.split("\t");
      const [mode, type, oid] = meta.split(" ");
      return { path: name, mode, type, oid };
    });
  if (
    git(["rev-parse", "HEAD"]) !== originalHead ||
    hash(fs.readFileSync(indexPath)) !== indexHash
  )
    throw Error("Original HEAD/index changed");
  save("candidate.json", {
    createdAt: new Date().toISOString(),
    commit,
    tree,
    branch,
    originalHead,
    parentCommit,
    originalBranch,
    originalIndexSha256: indexHash,
    originalIndexUnchanged: true,
    sourceFileCount: names.length,
    changedPaths: changed,
    excludedDirectories: exclusions,
    secretPathFindings: forbidden,
    credentialPatternFindings: secretFindings,
    blobs,
    note: "Candidate snapshot excludes local evidence/audit outputs. No checkout, staging into user index, or commit on current branch.",
  });
  console.log(
    JSON.stringify({ commit, tree, branch, sourceFileCount: names.length }),
  );
}
function push() {
  const c = JSON.parse(fs.readFileSync(manifestPath));
  // Non-forced creation only. Never move main or replace an existing release branch.
  const existing = git(["ls-remote", "origin", `refs/heads/${c.branch}`]);
  if (existing) throw Error("Release branch already exists");
  git(["push", "origin", `${c.commit}:refs/heads/${c.branch}`]);
  save("push.json", {
    at: new Date().toISOString(),
    status: "pushed",
    commit: c.commit,
    branch: c.branch,
    remoteRef: git(["ls-remote", "origin", `refs/heads/${c.branch}`]),
  });
  console.log(`Pushed ${c.branch} at ${c.commit}`);
}
async function inspect() {
  const c = JSON.parse(fs.readFileSync(manifestPath));
  const creds = git(
    ["credential", "fill"],
    "protocol=https\nhost=github.com\n\n",
  );
  const token = creds
    .split(/\r?\n/)
    .find((l) => l.startsWith("password="))
    ?.slice(9);
  if (!token) throw Error("GitHub credential unavailable");
  async function api(endpoint) {
    console.log(`Reading ${endpoint.split("?")[0]}`);
    const r = await fetch(
      `https://api.github.com/repos/luqelha/atlas-platform${endpoint}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "atlas-phase3f-ci",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!r.ok) throw Error(`GitHub API HTTP ${r.status}`);
    return r.json();
  }
  const data = await api(`/actions/runs?head_sha=${c.commit}&per_page=20`);
  const runs = [];
  for (const r of data.workflow_runs) {
    const jobs = await api(`/actions/runs/${r.id}/jobs?per_page=100`);
    const artifacts = await api(`/actions/runs/${r.id}/artifacts?per_page=100`);
    let logEvidence = [];
    if (r.status === "completed") {
      for (const job of jobs.jobs) {
        try {
          const response = await fetch(
            `https://api.github.com/repos/luqelha/atlas-platform/actions/jobs/${job.id}/logs`,
            {
              headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "atlas-phase3f-ci",
                Authorization: `Bearer ${token}`,
              },
              redirect: "manual",
              signal: AbortSignal.timeout(30000),
            },
          );
          const location = response.headers.get("location");
          const download = location
            ? await fetch(location, { signal: AbortSignal.timeout(30000) })
            : response;
          if (download.ok) {
            const body = Buffer.from(await download.arrayBuffer());
            const filename = `remote-ci-${r.id}-job-${job.id}.log`;
            fs.writeFileSync(path.join(output, filename), body);
            logEvidence.push({
              jobId: job.id,
              file: filename,
              sha256: hash(body),
              bytes: body.length,
            });
          } else
            logEvidence.push({ jobId: job.id, httpStatus: download.status });
        } catch (error) {
          logEvidence.push({
            jobId: job.id,
            errorName: error.name,
            errorCode: error.cause?.code,
          });
        }
      }
    }
    runs.push({
      id: r.id,
      url: r.html_url,
      workflowId: r.workflow_id,
      headSha: r.head_sha,
      branch: r.head_branch,
      event: r.event,
      status: r.status,
      conclusion: r.conclusion,
      runAttempt: r.run_attempt,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      logEvidence,
      jobs: jobs.jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        url: j.html_url,
        startedAt: j.started_at,
        completedAt: j.completed_at,
        steps: j.steps.map((s) => ({
          name: s.name,
          number: s.number,
          status: s.status,
          conclusion: s.conclusion,
          startedAt: s.started_at,
          completedAt: s.completed_at,
        })),
      })),
      artifacts: artifacts.artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        digest: a.digest,
        size: a.size_in_bytes,
        expired: a.expired,
        expiresAt: a.expires_at,
      })),
    });
  }
  const report = {
    observedAt: new Date().toISOString(),
    candidateCommit: c.commit,
    totalCount: data.total_count,
    status:
      runs.length && runs.every((r) => r.status === "completed")
        ? "completed"
        : "pending",
    runs,
  };
  save(`remote-ci-${Date.now()}.json`, report);
  console.log(
    JSON.stringify(
      {
        observedAt: report.observedAt,
        candidateCommit: c.commit,
        status: report.status,
        runs: runs.map((r) => ({
          id: r.id,
          url: r.url,
          status: r.status,
          conclusion: r.conclusion,
          jobs: r.jobs.map((j) => ({
            name: j.name,
            status: j.status,
            conclusion: j.conclusion,
            activeSteps: j.steps.filter(
              (s) => s.status === "in_progress" || s.conclusion === "failure",
            ),
            completedSteps: j.steps.filter((s) => s.conclusion === "success")
              .length,
          })),
          logEvidence: r.logEvidence,
        })),
      },
      null,
      2,
    ),
  );
}
Promise.resolve()
  .then(() => {
    if (process.argv[2] === "prepare") return prepare();
    if (process.argv[2] === "push") return push();
    if (process.argv[2] === "inspect") return inspect();
    throw Error("Use prepare, push, or inspect");
  })
  .catch((error) => {
    save(`collector-error-${Date.now()}.json`, {
      at: new Date().toISOString(),
      operation: process.argv[2],
      name: error.name,
      code: error.cause?.code || error.code,
      message: error.message,
    });
    console.error(error.message);
    process.exitCode = 1;
  });
