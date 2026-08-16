"use server";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_BASE = API_URL.replace(/\/api\/?$/, "");

export interface MediaItem {
  id: string;
  url: string;
  type: string;
  tenantId: string;
  createdAt: string;
}

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

    const result = await res.json();

    if (!res.ok) {
      return { error: result.message || "Failed to upload image" };
    }

    // Ensure full accessible URL
    const relativeUrl = result.url;
    const fullUrl = relativeUrl.startsWith("http")
      ? relativeUrl
      : `${API_BASE}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;

    return {
      success: true,
      data: result,
      url: fullUrl,
    };
  } catch (error) {
    console.error("Upload media error:", error);
    return { error: "An unexpected error occurred during upload." };
  }
}

export async function getMediaList(): Promise<{
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
    const res = await fetch(`${API_URL}/media`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { error: "Failed to fetch media library" };
    }

    const items: MediaItem[] = await res.json();

    // Map full URLs
    const formatted = items.map((item) => ({
      ...item,
      url: item.url.startsWith("http")
        ? item.url
        : `${API_BASE}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    }));

    return { data: formatted };
  } catch (error) {
    console.error("Fetch media error:", error);
    return { error: "An unexpected error occurred." };
  }
}
