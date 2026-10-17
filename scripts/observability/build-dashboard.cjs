const fs = require("node:fs");
const path = require("node:path");
const directory = path.resolve(
  __dirname,
  "../../ops/observability/grafana/dashboards",
);
const specs = [
  ["API scrape availability", "stat", 'up{job="atlas-api"}', "short"],
  [
    "Worker dependencies",
    "stat",
    'min by (instance) (atlas_dependency_up{job="atlas-api"})',
    "short",
  ],
  [
    "Active export handlers",
    "stat",
    "sum(atlas_export_worker_inflight)",
    "short",
  ],
  [
    "Firing alerts",
    "stat",
    'count(ALERTS{alertstate="firing"}) or vector(0)',
    "short",
  ],
  [
    "Request rate by route",
    "timeseries",
    "sum by (route, status_class) (rate(atlas_http_requests_total[5m]))",
    "reqps",
  ],
  [
    "HTTP p95 by route",
    "timeseries",
    "histogram_quantile(0.95, sum by (route, le) (rate(atlas_http_request_duration_seconds_bucket[5m])))",
    "s",
  ],
  ["Dependency health", "timeseries", "atlas_dependency_up", "short"],
  [
    "Probe freshness (seconds)",
    "timeseries",
    'time() - atlas_dependency_last_check_timestamp_seconds{dependency=~"database|redis|storage"}',
    "s",
  ],
  [
    "DB operation p95 (includes client queue wait)",
    "timeseries",
    "histogram_quantile(0.95, sum by (operation, le) (rate(atlas_db_operation_duration_seconds_bucket[5m])))",
    "s",
  ],
  [
    "DB operations in flight",
    "timeseries",
    "atlas_db_inflight_operations",
    "short",
  ],
  [
    "Response cache outcomes",
    "timeseries",
    "sum by (outcome) (rate(atlas_cache_access_total[5m]))",
    "ops",
  ],
  [
    "Exports by state (unexpired; max across replicas)",
    "timeseries",
    "max by (status) (atlas_export_tasks)",
    "short",
  ],
  [
    "Oldest pending age",
    "timeseries",
    "(time() - max(atlas_export_oldest_pending_timestamp_seconds)) and (max(atlas_export_oldest_pending_timestamp_seconds) > 0)",
    "s",
  ],
  [
    "Expired or missing leases",
    "timeseries",
    "max(atlas_export_expired_leases)",
    "short",
  ],
  [
    "Dispatcher tick age",
    "timeseries",
    "time() - atlas_export_dispatch_last_tick_timestamp_seconds",
    "s",
  ],
  [
    "Worker outcomes",
    "timeseries",
    "sum by (outcome) (increase(atlas_export_worker_total[5m]))",
    "short",
  ],
  [
    "Worker delivery p95",
    "timeseries",
    "histogram_quantile(0.95, sum by (le) (rate(atlas_export_worker_duration_seconds_bucket[5m])))",
    "s",
  ],
  [
    "Broker ready / unacknowledged messages",
    "timeseries",
    '{__name__=~"rabbitmq_queue_messages_ready|rabbitmq_queue_messages_unacked"}',
    "short",
  ],
  ["Broker consumers", "timeseries", "rabbitmq_queue_consumers", "short"],
  [
    "Vault available space",
    "timeseries",
    "atlas_vault_available_bytes",
    "bytes",
  ],
  [
    "Process resident memory",
    "timeseries",
    "atlas_process_resident_memory_bytes",
    "bytes",
  ],
  [
    "Process CPU seconds / second",
    "timeseries",
    "rate(atlas_process_cpu_seconds_total[5m])",
    "short",
  ],
  [
    "Event loop lag p99",
    "timeseries",
    "atlas_nodejs_eventloop_lag_p99_seconds",
    "s",
  ],
  [
    "Notification failures",
    "timeseries",
    "sum by (integration) (increase(alertmanager_notifications_failed_total[5m]))",
    "short",
  ],
  [
    "Journal retained firing / resolved notifications",
    "timeseries",
    "atlas_alert_journal_events",
    "short",
  ],
  ["Draining instances", "timeseries", "atlas_draining", "short"],
];
let y = 0;
const panels = specs.map(([title, type, expr, unit], index) => {
  const top = index < 4,
    width = top ? 6 : 12,
    height = top ? 4 : 8;
  if (index === 4) y = 4;
  const column = top ? index : index % 2;
  const panel = {
    id: index + 1,
    title,
    type,
    datasource: { type: "prometheus", uid: "atlas-prometheus" },
    gridPos: { x: column * width, y: top ? 0 : y, w: width, h: height },
    targets: [
      {
        refId: "A",
        expr,
        legendFormat:
          "{{instance}} {{route}} {{dependency}} {{status}} {{outcome}}",
        instant: type === "stat",
      },
    ],
    fieldConfig: {
      defaults: {
        unit,
        thresholds: {
          mode: "absolute",
          steps: [{ color: "green", value: null }],
        },
      },
      overrides: [],
    },
    options:
      type === "stat"
        ? {
            reduceOptions: {
              calcs: ["lastNotNull"],
              fields: "",
              values: false,
            },
            colorMode: "value",
            graphMode: "none",
          }
        : {
            legend: { displayMode: "table", placement: "bottom" },
            tooltip: { mode: "multi" },
          },
  };
  if (!top && column === 1) y += height;
  return panel;
});
const dashboard = {
  uid: "atlas-operations",
  title: "Atlas — Operational Resilience",
  description:
    "Private operational telemetry. HTTP routes are templates; no tenant/user/job labels. Queue gauges repeat per API replica and use max. The alert journal is not human paging.",
  tags: ["atlas", "operations"],
  schemaVersion: 39,
  version: 1,
  editable: false,
  timezone: "browser",
  refresh: "15s",
  time: { from: "now-1h", to: "now" },
  panels,
};
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(
  path.join(directory, "atlas-operations.json"),
  JSON.stringify(dashboard, null, 2) + "\n",
);
console.log(`Generated ${panels.length} operational panels`);
