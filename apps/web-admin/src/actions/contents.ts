"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { CreateContentInput, UpdateContentInput } from "@/lib/api";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

export async function createContent(data: CreateContentInput) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      return { error: result.message || "Failed to create content" };
    }

    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Create content error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function updateContent(id: string, data: UpdateContentInput) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/contents/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      return { error: result.message || "Failed to update content" };
    }

    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Update content error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteContent(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/contents/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
    });

    const result = await res.json();

    if (!res.ok) {
      return { error: result.message || "Failed to delete content" };
    }

    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Delete content error:", error);
    return { error: "An unexpected error occurred." };
  }
}
