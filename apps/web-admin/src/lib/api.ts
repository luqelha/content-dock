import { privateFileUrl } from "./files";
import { cache } from "react";
export type ContentStatus = "DRAFT" | "PUBLISHED";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(
      status === 403
        ? "You do not have permission to access this resource."
        : status === 401
          ? "Your session has expired. Please sign in again."
          : "The service could not load your data. Please try again.",
    );
    this.name = "ApiError";
  }
}

function assertResponse(response: Response) {
  if (!response.ok) {
    const id = response.headers.get("x-request-id");
    throw new ApiError(
      response.status,
      id && /^[a-zA-Z0-9-]{1,100}$/.test(id) ? id : undefined,
    );
  }
}
export const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:4000/api";

export async function fetchProfile(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  assertResponse(res);
  const user = await res.json();
  if (user && user.avatarUrl && !user.avatarUrl.startsWith("http")) {
    user.avatarUrl = privateFileUrl(user.avatarUrl);
  }
  return user;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  password?: string;
}

export async function updateProfile(
  token: string,
  userId: string,
  data: UpdateProfileInput,
) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message || "Failed to update profile",
    );
  }
  return res.json();
}

export async function uploadAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/users/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    throw new Error("Failed to upload avatar");
  }
  return res.json();
}

export const fetchTenants = cache(async (token: string) => {
  const res = await fetch(`${API_URL}/tenants`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  assertResponse(res);
  return res.json();
});

export async function fetchAnalytics(token: string, tenantId: string) {
  const res = await fetch(`${API_URL}/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  assertResponse(res);
  return res.json();
}

export async function fetchCategories(
  token: string,
  tenantId: string,
  page = 1,
  search = "",
) {
  const res = await fetch(
    `${API_URL}/categories?page=${page}&take=50&search=${encodeURIComponent(search)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
      },
      cache: "no-store",
    },
  );
  assertResponse(res);
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
  assertResponse(res);
  const json = await res.json();
  return json.data || [];
}

export async function getCategory(token: string, tenantId: string, id: string) {
  const response = await fetch(
    `${API_URL}/categories/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  assertResponse(response);
  return response.json();
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
  page = 1,
): Promise<MediaItemResponse[]> {
  const res = await fetch(`${API_URL}/media?page=${page}&take=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    cache: "no-store",
  });
  assertResponse(res);
  const items: MediaItemResponse[] = await res.json();
  return items.map((item: MediaItemResponse) => ({
    ...item,
    url: privateFileUrl(item.url),
  }));
}

export interface CreateContentInput {
  title: string;
  slug?: string;
  body: string;
  status?: ContentStatus;
  categoryId?: string | null;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  body?: string;
  status?: ContentStatus;
  categoryId?: string | null;
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
  if (res.status === 404) return null;
  assertResponse(res);
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
