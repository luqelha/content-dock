// Read-only discovery for release gates. Never dispatches CI for a mismatched tree,
// restores data, starts containers, or writes credentials into evidence.
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "../..");
process.chdir(root);
const evidence = path.join(root, "docs/improvements/phase-3/evidence/phase-3f");
fs.mkdirSync(evidence, { recursive: true });
const reportPath = path.join(evidence, `discovery-${Date.now()}.json`);
const report = {
  startedAt: new Date().toISOString(),
  mode: "read-only",
  probes: [],
};
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const write = () =>
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
function command(file, args, input) {
  const startedAt = new Date().toISOString();
  const result = cp.spawnSync(file, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 45000,
    input,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
    windowsHide: true,
  });
  // Never persist raw credential helper output, environment, or Docker config.
  return {
    startedAt,
    exitCode: result.status,
    errorCode: result.error?.code,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}
function probe(name, result) {
  report.probes.push({ name, at: new Date().toISOString(), ...result });
  write();
  console.log(`${name}: ${result.status}`);
}
async function main() {
  const head = command("git", ["rev-parse", "HEAD"]);
  if (head.exitCode !== 0) throw Error("Cannot resolve local source identity");
  report.localHead = head.stdout.trim();
  const status = command("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  if (status.exitCode !== 0) throw Error("Cannot inspect working tree");
  const changes = status.stdout.split(/\r?\n/).filter(Boolean);
  const sourceChanges = changes.filter(
    (line) =>
      !line
        .slice(3)
        .replaceAll('"', "")
        .startsWith("docs/improvements/phase-3/evidence/phase-3f/"),
  );
  probe("candidate-identity", {
    status: sourceChanges.length ? "blocked" : "passed",
    head: report.localHead,
    changedPathsOutsideEvidence: sourceChanges.length,
    sourceStatusSha256: sha256(sourceChanges.join("\n")),
    reason: sourceChanges.length
      ? "Working tree is not represented by HEAD; CI on HEAD cannot qualify this candidate."
      : "Clean candidate source.",
  });

  const remote = command("git", [
    "ls-remote",
    "origin",
    "HEAD",
    "refs/heads/main",
  ]);
  probe("remote-git", {
    status: remote.exitCode === 0 ? "passed" : "unavailable",
    command: "git ls-remote origin HEAD refs/heads/main",
    exitCode: remote.exitCode,
    refs:
      remote.exitCode === 0
        ? remote.stdout
            .trim()
            .split(/\r?\n/)
            .map((line) => {
              const [sha, ref] = line.split(/\s+/);
              return { sha, ref };
            })
        : [],
    errorCode: remote.errorCode,
  });

  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  let credentialSource = token ? "environment" : "none";
  if (!token) {
    const credentials = command(
      "git",
      ["credential", "fill"],
      "protocol=https\nhost=github.com\n\n",
    );
    const fields = Object.fromEntries(
      credentials.stdout
        .split(/\r?\n/)
        .filter((line) => line.includes("="))
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i), line.slice(i + 1)];
        }),
    );
    if (credentials.exitCode === 0 && fields.password) {
      token = fields.password;
      credentialSource = "git-credential-helper";
    }
    probe("github-credential", {
      status: token ? "available" : "unavailable",
      credentialSource,
      helperExitCode: credentials.exitCode,
      helperErrorCode: credentials.errorCode,
    });
  } else probe("github-credential", { status: "available", credentialSource });

  async function api(endpoint, project) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/luqelha/atlas-platform${endpoint}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "atlas-release-gate-audit",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok)
        return { status: "unavailable", httpStatus: response.status };
      return {
        status: "observed",
        httpStatus: response.status,
        data: project(await response.json()),
      };
    } catch (error) {
      return {
        status: "unavailable",
        errorCode: error.cause?.code || error.name,
      };
    }
  }
  probe(
    "github-repository",
    await api("", (data) => ({
      defaultBranch: data.default_branch,
      private: data.private,
      archived: data.archived,
      url: data.html_url,
    })),
  );
  probe(
    "remote-workflows",
    await api("/actions/workflows", (data) => ({
      totalCount: data.total_count,
      workflows: data.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        path: w.path,
        state: w.state,
        url: w.html_url,
      })),
    })),
  );
  probe(
    "remote-ci-head",
    await api(
      `/actions/runs?head_sha=${report.localHead}&per_page=20`,
      (data) => ({
        totalCount: data.total_count,
        runs: data.workflow_runs.map((r) => ({
          id: r.id,
          url: r.html_url,
          headSha: r.head_sha,
          branch: r.head_branch,
          event: r.event,
          status: r.status,
          conclusion: r.conclusion,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          runAttempt: r.run_attempt,
        })),
        qualifiesWorkingTree: false,
      }),
    ),
  );
  probe(
    "remote-ci-file",
    await api(
      `/contents/.github/workflows/ci.yml?ref=${report.localHead}`,
      (data) => {
        const content = Buffer.from(data.content, "base64").toString("utf8");
        return {
          gitBlob: data.sha,
          contentSha256: sha256(content),
          matchesLocal:
            sha256(content) ===
            sha256(fs.readFileSync(".github/workflows/ci.yml")),
          manualDispatchConfigured: /^\s{0,2}workflow_dispatch\s*:/m.test(
            content,
          ),
        };
      },
    ),
  );
  probe(
    "remote-environments",
    await api("/environments?per_page=100", (data) => ({
      totalCount: data.total_count,
      names: data.environments.map((e) => e.name),
    })),
  );
  probe(
    "remote-deployments",
    await api("/deployments?per_page=20", (data) => ({
      deployments: data.map((d) => ({
        id: d.id,
        environment: d.environment,
        sha: d.sha,
        ref: d.ref,
        createdAt: d.created_at,
        statusesUrl: d.statuses_url,
      })),
    })),
  );
  probe(
    "remote-releases",
    await api("/releases?per_page=10", (data) => ({
      releases: data.map((r) => ({
        id: r.id,
        tag: r.tag_name,
        draft: r.draft,
        prerelease: r.prerelease,
        url: r.html_url,
        assets: r.assets.map((a) => ({
          name: a.name,
          digest: a.digest,
          size: a.size,
        })),
      })),
    })),
  );

  const context = command("docker", ["context", "show"]);
  probe("docker-context", {
    status: context.exitCode === 0 ? "observed" : "unavailable",
    exitCode: context.exitCode,
    context: context.exitCode === 0 ? context.stdout.trim() : null,
  });
  const containers = command("docker", [
    "ps",
    "-a",
    "--no-trunc",
    "--format",
    "{{json .}}",
  ]);
  probe("container-inventory", {
    status: containers.exitCode === 0 ? "observed" : "unavailable",
    exitCode: containers.exitCode,
    containers:
      containers.exitCode === 0
        ? containers.stdout
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
              const c = JSON.parse(line);
              return {
                id: c.ID,
                name: c.Names,
                image: c.Image,
                state: c.State,
                status: c.Status,
              };
            })
        : [],
  });
  const images = command("docker", [
    "image",
    "ls",
    "--no-trunc",
    "--digests",
    "--format",
    "{{json .}}",
  ]);
  probe("image-inventory", {
    status: images.exitCode === 0 ? "observed" : "unavailable",
    exitCode: images.exitCode,
    images:
      images.exitCode === 0
        ? images.stdout
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
              const i = JSON.parse(line);
              return {
                repository: i.Repository,
                tag: i.Tag,
                imageId: i.ID,
                repoDigest: i.Digest,
              };
            })
        : [],
  });
  const configFiles = [
    ".env.production",
    "release-manifest.json",
    ".release/phase3f.json",
  ];
  probe("operator-input-discovery", {
    status: "observed",
    filesPresent: configFiles.filter((f) => fs.existsSync(f)),
    environmentNamesPresent: Object.keys(process.env).filter((name) =>
      /^(STAGING_|RESTORE_|RELEASE_|ATLAS_RELEASE_|AWS_PROFILE$|AWS_ACCESS_KEY_ID$)/.test(
        name,
      ),
    ),
    valuesRecorded: false,
  });
  report.gates = [
    {
      gate: "remote-ci",
      status: "blocked",
      reason:
        "No immutable candidate commit matching the working tree. Observed runs on HEAD do not qualify this source.",
    },
    {
      gate: "staging-tls-secrets-grants",
      status: "blocked",
      reason:
        "No identified staging endpoint or operator connection. Secret metadata alone cannot establish effective runtime values or grants.",
    },
    {
      gate: "off-host-restore",
      status: "blocked",
      reason:
        "No identified separate recovery host, backup access, escrow, recovery owner or RTO/RPO target. Local restore is not off-host evidence.",
    },
    {
      gate: "compatible-release-rollback",
      status: "blocked",
      reason:
        "No approved distinct previous release digest pair with archive-reader compatibility and lease fencing.",
    },
  ];
  report.status = "blocked";
  report.releaseReady = false;
  report.finishedAt = new Date().toISOString();
  write();
  console.log(path.relative(root, reportPath));
  process.exitCode = 2;
}
main().catch((error) => {
  report.status = "error";
  report.error = { name: error.name, code: error.code };
  report.finishedAt = new Date().toISOString();
  write();
  console.error("Discovery failed; inspect the evidence report.");
  process.exitCode = 1;
});
