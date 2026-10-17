import { cookies } from "next/headers";
import { API_URL } from "@/lib/workspace-api";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return new Response("Invalid export ID.", { status: 400 });
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  const tenantId = jar.get("atlas_active_tenant_id")?.value;
  if (!token || !tenantId) return new Response("Unauthorized", { status: 401 });
  const res = await fetch(`${API_URL}/export/download/${id}`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
    cache: "no-store",
  });
  if (!res.ok)
    return new Response("Export is unavailable or has expired.", {
      status: res.status,
    });
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="audit-${id}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
