// Test-only loopback TLS terminator. The committed self-signed key is public
// fixture material and MUST NOT be used by a deployment or trusted globally.
const https = require("node:https");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const fixtures = path.resolve(__dirname, "../../tests/browser/fixtures");
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(fixtures, "localhost-key.pem")),
    cert: fs.readFileSync(path.join(fixtures, "localhost-cert.pem")),
  },
  (request, response) => {
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: 3300,
        method: request.method,
        path: request.url,
        headers: { ...request.headers, "x-forwarded-proto": "https" },
      },
      (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end("Test upstream unavailable");
    });
    response.on("close", () => upstream.destroy());
    request.pipe(upstream);
  },
);
server.listen(3443, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    server.closeAllConnections();
  });
