export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api";

export async function fetchProfile(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function fetchTenants(token: string) {
  const res = await fetch(`${API_URL}/tenants`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function fetchAnalytics(token: string, tenantId: string) {
  const res = await fetch(`${API_URL}/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function fetchCategories(token: string, tenantId: string) {
  const res = await fetch(`${API_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function fetchContents(token: string, tenantId: string) {
  const res = await fetch(`${API_URL}/contents`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  const json = await res.json();
  return json.data || [];
}

export interface MediaItemResponse {
  id: string;
  url: string;
  type: string;
  tenantId: string;
  createdAt: string;
}

export async function fetchMedia(
  token: string,
  tenantId: string,
): Promise<MediaItemResponse[]> {
  const res = await fetch(`${API_URL}/media`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  const items: MediaItemResponse[] = await res.json();
  const apiBase = API_URL.replace(/\/api\/?$/, "");
  return items.map((item: MediaItemResponse) => ({
    ...item,
    url: item.url.startsWith("http")
      ? item.url
      : `${apiBase}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
  }));
}

export interface CreateContentInput {
  title: string;
  slug?: string;
  body: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  body?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string;
}

export async function getContent(
  token: string,
  tenantId: string,
  contentId: string,
) {
  const res = await fetch(`${API_URL}/contents/${contentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function createContent(
  token: string,
  tenantId: string,
  data: CreateContentInput,
) {
  const res = await fetch(`${API_URL}/contents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to create content");
  }
  return res.json();
}

export async function updateContent(
  token: string,
  tenantId: string,
  contentId: string,
  data: UpdateContentInput,
) {
  const res = await fetch(`${API_URL}/contents/${contentId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to update content");
  }
  return res.json();
}
