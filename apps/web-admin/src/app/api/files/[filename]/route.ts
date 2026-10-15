import { cookies } from "next/headers";
import { API_URL } from "@/lib/workspace-api";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename))
    return new Response("Not found", { status: 404 });
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });
  const res = await fetch(`${API_URL}/media-files/${filename}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(jar.get("atlas_active_tenant_id")?.value
        ? { "x-tenant-id": jar.get("atlas_active_tenant_id")!.value }
        : {}),
    },
    cache: "no-store",
  });
  if (!res.ok)
    return new Response("File not available", { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
