const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { webkit } = require("playwright");
process.chdir(path.resolve(__dirname, "../.."));
(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    observations: [],
  };
  const server = https.createServer(
    {
      key: fs.readFileSync("tests/browser/fixtures/localhost-key.pem"),
      cert: fs.readFileSync("tests/browser/fixtures/localhost-cert.pem"),
    },
    (req, res) => {
      if (req.url === "/zip") {
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="fixture.zip"',
        });
        res.end("fixture");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          '<a id="native" href="/zip">Native</a><a id="attribute" href="/zip" download>Attribute</a>',
        );
      }
    },
  );
  await new Promise((r, j) => {
    server.once("error", j);
    server.listen(3445, "127.0.0.1", r);
  });
  let browser;
  try {
    browser = await webkit.launch();
    report.browserVersion = browser.version();
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
    });
    for (const name of ["native", "attribute"]) {
      await page.goto("https://127.0.0.1:3445");
      const result = page.waitForEvent("download", { timeout: 10000 }).then(
        async (d) => ({ status: "download", failure: await d.failure() }),
        () => ({ status: "no-download-event" }),
      );
      await page.locator("#" + name).click();
      report.observations.push({ variant: name, ...(await result) });
    }
    fs.writeFileSync(
      "docs/improvements/phase-4/evidence/phase-4d/download-probe.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    server.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
