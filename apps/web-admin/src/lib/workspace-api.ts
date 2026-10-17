import "server-only";
import type { ZodType } from "zod";
import { parseContract, apiMessage } from "./contracts";
import { cookies } from "next/headers";
import { fetchTenants } from "./api";

export const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";
export async function workspaceRequest<T>(
  path: string,
  schema: ZodType<T>,
  init: RequestInit = {},
  tenantId?: string,
): Promise<T> {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token)
    throw new Error("Your session has expired. Please sign in again.");
  if (path === "/tenants" && (!init.method || init.method === "GET"))
    return parseContract(schema, await fetchTenants(token));
  const tenant = tenantId ?? jar.get("atlas_active_tenant_id")?.value;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (tenant) headers.set("x-tenant-id", tenant);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiMessage(error, "The request could not be completed."));
  }
  return parseContract(schema, await response.json());
}
