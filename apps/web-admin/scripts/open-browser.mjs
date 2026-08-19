import http from 'node:http';
import { exec } from 'node:child_process';

const port = process.env.PORT || 3000;
const url = process.env.URL || `http://localhost:${port}`;
let opened = false;

function openBrowser(targetUrl) {
  if (opened) return;
  opened = true;

  const startCmd =
    process.platform === 'darwin'
      ? `open "${targetUrl}"`
      : process.platform === 'win32'
      ? `start "" "${targetUrl}"`
      : `xdg-open "${targetUrl}"`;

  exec(startCmd, (err) => {
    if (err) {
      console.warn(`[open-browser] Could not automatically open browser: ${err.message}`);
    }
  });
}

function checkServer() {
  const req = http.get(url, () => {
    openBrowser(url);
    setTimeout(() => process.exit(0), 200);
  });

  req.on('error', () => {
    setTimeout(checkServer, 500);
  });

  req.setTimeout(1000, () => {
    req.destroy();
    setTimeout(checkServer, 500);
  });
}

setTimeout(checkServer, 500);
