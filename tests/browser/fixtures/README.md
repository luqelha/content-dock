# Browser fixtures

`upload.png` is synthetic upload data. `localhost-cert.pem` and
`localhost-key.pem` form a **public, self-signed test fixture**, exclusively for
the loopback Playwright HTTPS terminator on port 3443. The key is intentionally
committed fixture material, not a deployment credential. Do not import this
certificate into a trust store or use it for a deployment. Playwright ignores
its certificate error only in its isolated CI browser context/readiness probe.

Regenerate the pair when it expires or test hosts change, then rerun the matrix:

```sh
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout tests/browser/fixtures/localhost-key.pem \
  -out tests/browser/fixtures/localhost-cert.pem \
  -days 3650 -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
```
