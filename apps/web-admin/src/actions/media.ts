"use server";

import { parseContract, apiMessage, mediaSchema } from "@/lib/contracts";
import type { MediaItem } from "@/lib/contracts";
export type { MediaItem } from "@/lib/contracts";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { privateFileUrl } from "@/lib/files";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

export async function uploadMedia(formData: FormData): Promise<{
  success?: boolean;
  data?: MediaItem;
  url?: string;
  error?: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized. Please log in again." };
  }

  try {
    const res = await fetch(`${API_URL}/media/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
      body: formData,
    });

    const raw: unknown = await res.json();

    if (!res.ok) {
      return { error: apiMessage(raw, "Failed to upload image") };
    }

    const result = parseContract(mediaSchema, raw);
    // Ensure full accessible URL
    const relativeUrl = result.url;
    const fullUrl = privateFileUrl(relativeUrl);

    revalidatePath("/dashboard/media");

    return {
      success: true,
      data: {
        ...result,
        url: fullUrl,
      },
      url: fullUrl,
    };
  } catch (error) {
    console.error("Upload media error:", error);
    return { error: "An unexpected error occurred during upload." };
  }
}

export async function getMediaList(page = 1): Promise<{
  data?: MediaItem[];
  error?: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(
      `${API_URL}/media?page=${Math.max(1, Math.floor(page))}&take=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return { error: "Failed to fetch media library" };
    }

    const items = parseContract(mediaSchema.array(), await res.json());

    // Map full URLs
    const formatted = items.map((item) => ({
      ...item,
      url: privateFileUrl(item.url),
    }));

    return { data: formatted };
  } catch (error) {
    console.error("Fetch media error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteMedia(id: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return { error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_URL}/media/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      return { error: apiMessage(errorJson, "Failed to delete media item") };
    }

    revalidatePath("/dashboard/media");
    return { success: true };
  } catch (error) {
    console.error("Delete media error:", error);
    return { error: "An unexpected error occurred while deleting media." };
  }
}

export async function deleteMultipleMedia(ids: string[]): Promise<{
  success?: boolean;
  deletedCount: number;
  failedCount: number;
  deletedIds: string[];
  failedIds: string[];
  error?: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const tenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  if (!token || !tenantId) {
    return {
      error: "Unauthorized",
      deletedCount: 0,
      failedCount: ids.length,
      deletedIds: [],
      failedIds: ids,
    };
  }

  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  for (const id of [...new Set(ids)]) {
    try {
      const res = await fetch(`${API_URL}/media/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId,
        },
      });

      if (res.ok) {
        deletedIds.push(id);
      } else {
        failedIds.push(id);
      }
    } catch {
      failedIds.push(id);
    }
  }

  revalidatePath("/dashboard/media");

  return {
    success: failedIds.length === 0,
    deletedCount: deletedIds.length,
    failedCount: failedIds.length,
    deletedIds,
    failedIds,
    ...(failedIds.length
      ? {
          error: `${failedIds.length} item(s) could not be deleted. They remain selected for retry.`,
        }
      : {}),
  };
}
