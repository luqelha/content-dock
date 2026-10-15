const exceptions = [
  {
    name: "braces",
    url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
    severity: "high",
    range: "<=3.0.3",
    reviewBy: "2026-11-13",
  },
  {
    name: "sprintf-js",
    url: "https://github.com/advisories/GHSA-hp3w-g68c-fv3c",
    severity: "moderate",
    range: "<=1.1.3",
    reviewBy: "2026-11-13",
  },
  {
    name: "postcss-selector-parser",
    url: "https://github.com/advisories/GHSA-rj75-hqrm-r3gf",
    severity: "moderate",
    range: "<7.1.6",
    reviewBy: "2026-11-13",
  },
];

function reviewAudit(audit, lock, now = new Date()) {
  if (
    !audit?.metadata?.vulnerabilities ||
    !audit.vulnerabilities ||
    audit.error
  )
    throw new Error("Invalid or unavailable npm audit report");
  const failures = [];
  for (const finding of Object.values(audit.vulnerabilities)) {
    for (const via of finding.via) {
      if (typeof via === "string") {
        if (!audit.vulnerabilities[via])
          failures.push(`Missing advisory details: ${via}`);
        continue;
      }
      const exception = exceptions.find(
        (item) =>
          item.name === via.name &&
          item.url === via.url &&
          item.severity === via.severity &&
          item.range === via.range,
      );
      if (!exception || now >= new Date(`${exception.reviewBy}T00:00:00Z`))
        failures.push(`Unreviewed or expired exception: ${via.url}`);
    }
    if (!finding.nodes.length)
      failures.push(`Missing dependency paths: ${finding.name}`);
    for (const node of finding.nodes) {
      if (lock.packages[node]?.dev !== true)
        failures.push(`Runtime exposure: ${node}`);
      if (
        finding.name === "postcss-selector-parser" &&
        node !==
          "node_modules/@tailwindcss/typography/node_modules/postcss-selector-parser"
      )
        failures.push(`Unexpected vulnerable parser path: ${node}`);
    }
  }
  return [...new Set(failures)];
}
module.exports = { reviewAudit };
