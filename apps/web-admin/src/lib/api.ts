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
  return res.json();
}
