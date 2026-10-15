"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { workspaceRequest } from "@/lib/workspace-api";

type Result<T> = { data: T; error?: never } | { error: string; data?: never };
async function run<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await action();
    revalidatePath("/dashboard", "layout");
    return { data };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Request failed. Please try again.",
    };
  }
}
async function tenantId() {
  const id = (await cookies()).get("atlas_active_tenant_id")?.value;
  if (!id) throw new Error("Select a workspace first.");
  return id;
}
export async function saveWorkspace(form: FormData) {
  return run(async () => {
    const id = await tenantId();
    return workspaceRequest(`/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.get("name"),
        domain: form.get("domain") || null,
      }),
    });
  });
}
export async function createWorkspace(form: FormData) {
  return run(async () => {
    const tenant = await workspaceRequest<{ id: string }>("/tenants", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        ...(form.get("domain") ? { domain: form.get("domain") } : {}),
      }),
    });
    (await cookies()).set("atlas_active_tenant_id", tenant.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return tenant;
  });
}
export async function selectWorkspace(id: string) {
  return run(async () => {
    const tenants = await workspaceRequest<{ id: string }[]>("/tenants");
    if (!tenants.some((t) => t.id === id))
      throw new Error("Workspace is not available.");
    (await cookies()).set("atlas_active_tenant_id", id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return { id };
  });
}
export async function inviteMember(form: FormData) {
  return run(async () =>
    workspaceRequest<{ token: string; expiresAt: string; email: string }>(
      `/tenants/${await tenantId()}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          role: form.get("role"),
        }),
      },
    ),
  );
}
export async function changeMember(userId: string, role?: string) {
  return run(async () =>
    workspaceRequest(
      `/tenants/${await tenantId()}/members/${encodeURIComponent(userId)}`,
      {
        method: role ? "PATCH" : "DELETE",
        ...(role ? { body: JSON.stringify({ role }) } : {}),
      },
    ),
  );
}
export async function acceptInvitation(token: string) {
  return run(async () => {
    const data = await workspaceRequest<{ tenantId: string }>(
      "/tenants/invitations/accept",
      { method: "POST", body: JSON.stringify({ token }) },
    );
    (await cookies()).set("atlas_active_tenant_id", data.tenantId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return data;
  });
}
export async function requestExport(form: FormData) {
  return run(async () =>
    workspaceRequest<{ data: { jobId: string; status: string } }>(
      "/export/logs",
      {
        method: "POST",
        body: JSON.stringify({
          startDate: form.get("startDate"),
          endDate: form.get("endDate"),
        }),
      },
    ),
  );
}
export async function exportStatus(jobId: string) {
  try {
    return {
      data: await workspaceRequest<{
        data: {
          status: string;
          progress: number;
          startDate: string;
          endDate: string;
          error?: string;
        };
      }>(`/export/status/${encodeURIComponent(jobId)}`),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to retrieve export status.",
    };
  }
}
