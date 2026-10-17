const fs = require("node:fs");
const path = require("node:path");
const runbook = "docs/improvements/phase-4/OPERATIONAL-RUNBOOKS.md#";
const labels = { job: "atlas-api", instance: "api:9091" };
function check(
  alertname,
  time,
  expected = [],
  severity = "critical",
  summary = "",
  anchor = "dependency-outage",
) {
  return {
    eval_time: time,
    alertname,
    exp_alerts: expected.map((extra) => ({
      exp_labels: { ...labels, ...extra, severity },
      exp_annotations: { summary, runbook: runbook + anchor },
    })),
  };
}
const tests = [
  {
    name: "dependency hold duration and recovery",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_dependency_up{job="atlas-api",instance="api:9091",dependency="redis"}',
        values: "1 0 0 0 1+0x20",
      },
    ],
    alert_rule_test: [
      check("AtlasDependencyUnavailable", "30s"),
      check(
        "AtlasDependencyUnavailable",
        "45s",
        [{ dependency: "redis" }],
        "critical",
        "Atlas dependency is unavailable",
      ),
      check("AtlasDependencyUnavailable", "1m"),
    ],
  },
  {
    name: "empty backlog does not alert",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_export_oldest_pending_timestamp_seconds{job="atlas-api",instance="api:9091"}',
        values: "0+0x40",
      },
    ],
    alert_rule_test: [check("AtlasExportBacklog", "5m")],
  },
  {
    name: "old pending backlog and expired leases",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_export_oldest_pending_timestamp_seconds{job="atlas-api",instance="api:9091"}',
        values: "1+0x40",
      },
      {
        series:
          'atlas_export_expired_leases{job="atlas-api",instance="api:9091"}',
        values: "1+0x4 0+0x35",
      },
    ],
    alert_rule_test: [
      check(
        "AtlasExportBacklog",
        "4m",
        [{}],
        "warning",
        "Export jobs are not progressing",
        "export-backlog",
      ),
      check(
        "AtlasExpiredLease",
        "1m",
        [{}],
        "warning",
        "Export lease recovery is overdue",
        "export-backlog",
      ),
      check("AtlasExpiredLease", "2m"),
    ],
  },
  {
    name: "stale probe cannot remain healthy silently",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_dependency_last_check_timestamp_seconds{job="atlas-api",instance="api:9091",dependency="database"}',
        values: "0+0x30",
      },
    ],
    alert_rule_test: [
      check("AtlasProbeStale", "1m"),
      check(
        "AtlasProbeStale",
        "2m",
        [{ dependency: "database" }],
        "warning",
        "Dependency telemetry is stale",
        "stale-telemetry",
      ),
    ],
  },
  {
    name: "full vault warning and recovery",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_vault_available_bytes{job="atlas-api",instance="api:9091"}',
        values: "5+0x3 50+0x20",
      },
      {
        series: 'atlas_vault_size_bytes{job="atlas-api",instance="api:9091"}',
        values: "100+0x30",
      },
    ],
    alert_rule_test: [
      check(
        "AtlasVaultSpaceLow",
        "30s",
        [{}],
        "critical",
        "Vault filesystem has less than ten percent available",
        "vault-space",
      ),
      check("AtlasVaultSpaceLow", "1m"),
    ],
  },
  {
    name: "scrape unavailable and restored",
    interval: "15s",
    input_series: [
      {
        series: 'up{job="atlas-api",instance="api:9091"}',
        values: "0+0x4 1+0x20",
      },
    ],
    alert_rule_test: [
      check("AtlasApiUnavailable", "45s"),
      check(
        "AtlasApiUnavailable",
        "1m",
        [{}],
        "critical",
        "Atlas metrics/liveness target is unavailable",
        "api-unavailable",
      ),
      check("AtlasApiUnavailable", "2m"),
    ],
  },
  {
    name: "missing API scrape target",
    interval: "15s",
    input_series: [],
    alert_rule_test: [
      {
        eval_time: "1m",
        alertname: "AtlasApiUnavailable",
        exp_alerts: [
          {
            exp_labels: { job: "atlas-api", severity: "critical" },
            exp_annotations: {
              summary: "Atlas metrics/liveness target is unavailable",
              runbook: runbook + "api-unavailable",
            },
          },
        ],
      },
    ],
  },
  {
    name: "failure counter fires then resolves after window",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_export_worker_total{job="atlas-api",instance="api:9091",outcome="failed"}',
        values: "0 1+0x40",
      },
    ],
    alert_rule_test: [
      check(
        "AtlasExportFailures",
        "30s",
        [{}],
        "warning",
        "Export deliveries have failed or require recovery",
        "export-backlog",
      ),
      check("AtlasExportFailures", "6m"),
    ],
  },
  {
    name: "HTTP errors require sustained traffic",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_http_requests_total{job="atlas-api",instance="api:9091",route="/api/test",method="GET",status_class="5xx"}',
        values: "0+5x40",
      },
      {
        series:
          'atlas_http_requests_total{job="atlas-api",instance="api:9091",route="/api/test",method="GET",status_class="2xx"}',
        values: "0+45x40",
      },
    ],
    alert_rule_test: [
      check("AtlasHttpErrors", "1m"),
      check(
        "AtlasHttpErrors",
        "4m",
        [{}],
        "warning",
        "HTTP server errors exceed five percent",
        "http-errors-or-latency",
      ),
    ],
  },
  {
    name: "low traffic errors do not page",
    interval: "15s",
    input_series: [
      {
        series:
          'atlas_http_requests_total{job="atlas-api",instance="api:9091",route="/api/test",method="GET",status_class="5xx"}',
        values: "0 1+0x40",
      },
    ],
    alert_rule_test: [check("AtlasHttpErrors", "4m")],
  },
];
tests.push({
  name: "dispatcher heartbeat stalls and recovers",
  interval: "15s",
  input_series: [
    {
      series:
        'atlas_export_dispatch_last_tick_timestamp_seconds{job="atlas-api",instance="api:9091"}',
      values: "0+0x12 180+15x30",
    },
  ],
  alert_rule_test: [
    check(
      "AtlasDispatcherStalled",
      "2m30s",
      [{}],
      "critical",
      "Export dispatcher has stopped polling",
      "export-backlog",
    ),
    check("AtlasDispatcherStalled", "4m"),
  ],
});
tests.push({
  name: "latency histogram fires and recovers",
  interval: "15s",
  input_series: [
    {
      series:
        'atlas_http_request_duration_seconds_bucket{job="atlas-api",instance="api:9091",le="1"}',
      values: "0+1x28 28+100x40",
    },
    {
      series:
        'atlas_http_request_duration_seconds_bucket{job="atlas-api",instance="api:9091",le="5"}',
      values: "0+100x69",
    },
    {
      series:
        'atlas_http_request_duration_seconds_bucket{job="atlas-api",instance="api:9091",le="+Inf"}',
      values: "0+100x69",
    },
  ],
  alert_rule_test: [
    check(
      "AtlasHttpLatency",
      "6m",
      [{}],
      "warning",
      "HTTP p95 exceeds two seconds",
      "http-errors-or-latency",
    ),
    check("AtlasHttpLatency", "14m"),
  ],
});
tests.push({
  name: "retention failure window resolves",
  interval: "15s",
  input_series: [
    {
      series:
        'atlas_retention_errors_total{job="atlas-api",instance="api:9091"}',
      values: "0 1+0x85",
    },
  ],
  alert_rule_test: [
    check(
      "AtlasRetentionErrors",
      "1m",
      [{}],
      "warning",
      "Vault retention inventory or cleanup failed",
      "vault-space",
    ),
    check("AtlasRetentionErrors", "20m"),
  ],
});
for (const [alert, job, instance, severity, summary, anchor] of [
  [
    "AtlasBrokerExporterUnavailable",
    "rabbitmq",
    "rabbitmq:15692",
    "warning",
    "RabbitMQ exporter is unavailable",
    "dependency-outage",
  ],
  [
    "AtlasAlertmanagerUnavailable",
    "alertmanager",
    "alertmanager:9093",
    "critical",
    "Alertmanager is unavailable",
    "alert-delivery",
  ],
  [
    "AtlasAlertJournalUnavailable",
    "alert-journal",
    "alert-journal:9099",
    "critical",
    "Durable local alert receiver is unavailable",
    "alert-delivery",
  ],
])
  tests.push({
    name: alert + " hold and recovery",
    interval: "15s",
    input_series: [
      {
        series: `up{job="${job}",instance="${instance}"}`,
        values: "0+0x4 1+0x20",
      },
    ],
    alert_rule_test: [
      check(alert, "1m", [{ job, instance }], severity, summary, anchor),
      check(alert, "2m"),
    ],
  });
tests.push({
  name: "ready messages without consumers and recovery",
  interval: "15s",
  input_series: [
    {
      series:
        'rabbitmq_queue_consumers{job="rabbitmq",instance="rabbitmq:15692"}',
      values: "0+0x4 1+0x20",
    },
    {
      series:
        'rabbitmq_queue_messages_ready{job="rabbitmq",instance="rabbitmq:15692"}',
      values: "1+0x30",
    },
  ],
  alert_rule_test: [
    check(
      "AtlasBrokerNoConsumers",
      "1m",
      [{ job: "rabbitmq", instance: "rabbitmq:15692" }],
      "critical",
      "Broker has queued messages without consumers",
      "export-backlog",
    ),
    check("AtlasBrokerNoConsumers", "2m"),
  ],
});
tests.push({
  name: "notification failure and recovered delivery window",
  interval: "15s",
  input_series: [
    {
      series:
        'alertmanager_notifications_failed_total{job="alertmanager",instance="alertmanager:9093",integration="webhook"}',
      values: "0+1x4 4+0x40",
    },
  ],
  alert_rule_test: [
    check(
      "AtlasAlertDeliveryFailed",
      "2m",
      [
        {
          job: "alertmanager",
          instance: "alertmanager:9093",
          integration: "webhook",
        },
      ],
      "critical",
      "Alertmanager cannot deliver notifications",
      "alert-delivery",
    ),
    check("AtlasAlertDeliveryFailed", "9m"),
  ],
});
fs.writeFileSync(
  path.resolve(__dirname, "../../ops/observability/alerts.test.json"),
  JSON.stringify(
    { rule_files: ["alerts.yml"], evaluation_interval: "15s", tests },
    null,
    2,
  ) + "\n",
);
console.log(`Generated ${tests.length} alert timing/recovery scenarios`);
