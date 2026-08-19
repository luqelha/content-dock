"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/categories`, {
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
      return { error: result.message || "Failed to create category" };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Create category error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function updateCategory(
  id: string,
  data: { name: string; slug: string; description?: string },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/categories/${id}`, {
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
      return { error: result.message || "Failed to update category" };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Update category error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteCategory(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
    });

    const result = await res.json();

    if (!res.ok) {
      return { error: result.message || "Failed to delete category" };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/content");
    return { success: true, data: result };
  } catch (error) {
    console.error("Delete category error:", error);
    return { error: "An unexpected error occurred." };
  }
}
