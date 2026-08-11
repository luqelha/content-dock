export default function DashboardPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your workspace activity.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total content"
          value="1,248"
          detail="+12% from last month"
        />
        <MetricCard
          label="Active users"
          value="142"
          detail="+3% from last month"
        />
        <MetricCard
          label="Storage used"
          value="48.2 GB"
          detail="85% of limit"
        />
      </div>

      {/* Chart placeholder */}
      <div className="rounded-lg border border-border min-h-90 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Activity chart</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
