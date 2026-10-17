// Internal durable notification journal. Configure a human paging receiver separately.
const http = require("node:http");
const fs = require("node:fs/promises");
const directory = process.env.ALERT_JOURNAL_DIR || "/data";
let events = [];
let pending = Promise.resolve();
const allowed = [
  "alertname",
  "instance",
  "job",
  "severity",
  "dependency",
  "service",
];
async function main() {
  await fs.mkdir(directory, { recursive: true });
  try {
    events = JSON.parse(await fs.readFile(directory + "/events.json", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "GET" && request.url === "/health") {
      response.end("ok");
      return;
    }
    if (request.method === "GET" && request.url === "/events") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(events));
      return;
    }
    if (request.method === "GET" && request.url === "/metrics") {
      response.setHeader("Content-Type", "text/plain; version=0.0.4");
      response.end(
        "# HELP atlas_alert_journal_events Notifications retained in the bounded durable journal.\n# TYPE atlas_alert_journal_events gauge\n" +
          ["firing", "resolved"]
            .map(
              (status) =>
                `atlas_alert_journal_events{status="${status}"} ${events.filter((event) => event.status === status).length}`,
            )
            .join("\n") +
          "\n",
      );
      return;
    }
    if (request.method !== "POST" || request.url !== "/alerts") {
      response.writeHead(404).end();
      return;
    }
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 1048576) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!Array.isArray(input.alerts) || input.alerts.length > 100) {
        response.writeHead(400).end();
        return;
      }
      const batch = input.alerts.map((alert) => ({
        receivedAt: new Date().toISOString(),
        status: alert.status === "resolved" ? "resolved" : "firing",
        labels: Object.fromEntries(
          allowed
            .filter((key) => typeof alert.labels?.[key] === "string")
            .map((key) => [key, alert.labels[key].slice(0, 200)]),
        ),
        startsAt: String(alert.startsAt || "").slice(0, 40),
        endsAt: String(alert.endsAt || "").slice(0, 40),
      }));
      const write = pending.then(async () => {
        const updated = [...events, ...batch].slice(-200);
        await fs.writeFile(directory + "/events.tmp", JSON.stringify(updated), {
          mode: 0o600,
        });
        await fs.rename(directory + "/events.tmp", directory + "/events.json");
        events = updated;
      });
      pending = write.catch(() => undefined);
      await write;
      response.writeHead(200).end("recorded");
    } catch {
      response.writeHead(503).end("notification not committed");
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.maxConnections = 32;
  server.listen(Number(process.env.PORT || 9099), "0.0.0.0", () =>
    process.send?.({ port: server.address().port }),
  );
  process.once("SIGTERM", () => {
    server.close(() => void pending.then(() => process.exit(0)));
  });
}
main().catch(() => {
  console.error("Alert journal startup failed");
  process.exitCode = 1;
});
