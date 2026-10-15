// Isolated protocol fixtures, no published ports or application data.
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const suffix = `${process.pid}-${Date.now()}`;
const network = `atlas-proxy-test-${suffix}`;
const echo = `${network}-echo`;
const edge = `${network}-edge`;
function docker(...args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    timeout: 60000,
  }).trim();
}
async function main() {
  docker("network", "create", network);
  try {
    docker(
      "run",
      "-d",
      "--name",
      echo,
      "--network",
      network,
      "--network-alias",
      "api",
      "--network-alias",
      "web",
      "node:24-slim",
      "node",
      "-e",
      "const http=require('http'); for(const port of [3000,4000])http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.headers));}).listen(port,'0.0.0.0');",
    );
    docker(
      "run",
      "-d",
      "--name",
      edge,
      "--network",
      network,
      "--network-alias",
      "edge",
      "--mount",
      `type=bind,source=${path.resolve(__dirname, "../../nginx/nginx.conf")},target=/etc/nginx/nginx.conf,readonly`,
      "nginx:alpine",
    );
    docker(
      "exec",
      echo,
      "node",
      "-e",
      `
      const assert=require('node:assert/strict');
      const net=require('node:net');
      async function ready(){for(let i=0;i<30;i++){try{const r=await fetch('http://edge/api/probe');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Proxy not ready');}
      (async()=>{
        await ready();
        const direct=await (await fetch('http://edge/api/probe',{headers:{'X-Forwarded-For':'203.0.113.99','X-Atlas-Client-IP':'203.0.113.99','X-Real-IP':'203.0.113.99','X-Forwarded-Proto':'https'}})).json();
        assert.notEqual(direct['x-forwarded-for'],'203.0.113.99');
        assert.equal(direct['x-forwarded-for'],direct['x-atlas-client-ip']);
        assert.equal(direct['x-real-ip'],direct['x-atlas-client-ip']);
        assert.equal(direct['x-forwarded-proto'],'http');
        for(const ip of ['198.51.100.11','198.51.100.12']){
          const raw=await new Promise((resolve,reject)=>{let data='';const socket=net.connect(81,'edge',()=>socket.write('PROXY TCP4 '+ip+' 192.0.2.1 1234 443\\r\\nGET /api/probe HTTP/1.0\\r\\nHost: atlas.test\\r\\nX-Atlas-Client-IP: 203.0.113.99\\r\\nX-Forwarded-For: 203.0.113.99\\r\\n\\r\\n'));socket.setTimeout(5000,()=>socket.destroy(Error('timeout')));socket.on('data',chunk=>data+=chunk);socket.on('end',()=>resolve(data));socket.on('error',reject);});
          assert.match(raw,/200 OK/);const headers=JSON.parse(raw.split('\\r\\n\\r\\n')[1]);
          assert.equal(headers['x-atlas-client-ip'],ip);assert.equal(headers['x-forwarded-for'],ip);assert.equal(headers['x-forwarded-proto'],'https');
        }
        console.log('PASS: spoofed headers replaced; two PROXY-protocol clients preserved; HTTPS origin preserved');
      })().catch(e=>{console.error(e);process.exitCode=1});
    `,
    );
    console.log("PASS: isolated Nginx identity and protocol regression");
  } finally {
    for (const container of [edge, echo]) {
      try {
        docker("rm", "-f", container);
      } catch {
        /* May not have started. */
      }
    }
    docker("network", "rm", network);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
