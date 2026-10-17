const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fork } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
test("alert notifications persist, retain firing/resolved states, strip extra labels and remain bounded", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "atlas-alert-journal-test-"),
  );
  let child;
  async function start() {
    child = fork(
      path.resolve(__dirname, "../../ops/observability/alert-journal.cjs"),
      [],
      {
        env: { ...process.env, PORT: "0", ALERT_JOURNAL_DIR: dir },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      },
    );
    const ready = await Promise.race([
      once(child, "message"),
      new Promise((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Journal startup timeout")),
          10000,
        );
        timer.unref();
      }),
    ]);
    return `http://127.0.0.1:${ready[0].port}`;
  }
  async function stop() {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  try {
    let url = await start();
    const post = async (body) =>
      fetch(url + "/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    for (let batch = 0; batch < 3; batch++)
      assert.equal(
        (
          await post({
            alerts: Array.from({ length: 100 }, () => ({
              status: batch === 2 ? "resolved" : "firing",
              labels: {
                alertname: "AtlasDependencyUnavailable",
                dependency: "redis",
                jobId: "must-not-persist",
                authorization: "must-not-persist",
              },
            })),
          })
        ).status,
        200,
      );
    const events = await (await fetch(url + "/events")).json();
    assert.equal(events.length, 200);
    assert.equal(events.filter((e) => e.status === "resolved").length, 100);
    assert.ok(!JSON.stringify(events).includes("must-not-persist"));
    assert.equal((await post({ alerts: "invalid" })).status, 400);
    await stop();
    url = await start();
    assert.deepEqual(await (await fetch(url + "/events")).json(), events);
    assert.match(
      await (await fetch(url + "/metrics")).text(),
      /status="resolved"} 100/,
    );
  } finally {
    if (child?.exitCode === null) await stop();
  }
});
