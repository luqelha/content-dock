"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClientHeaders } from "@/lib/auth-client-headers";
import {
  authFailure,
  authResponseError,
  dashboardDestination,
  validateAuthForm,
  type AuthState,
} from "@/lib/auth-validation";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

export async function login(
  prevState: unknown,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, fieldErrors } = validateAuthForm(formData);
  if (Object.keys(fieldErrors).length) {
    return authFailure(email, "Check the highlighted fields.", fieldErrors);
  }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authClientHeaders(await headers(), String(email)),
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return authFailure(email, authResponseError(res.status));
    }

    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("access_token" in data) ||
      typeof data.access_token !== "string" ||
      !data.access_token ||
      !("refresh_token" in data) ||
      typeof data.refresh_token !== "string" ||
      !data.refresh_token
    ) {
      return authFailure(email, authResponseError(502));
    }

    const cookieStore = await cookies();

    // Workspace selection belongs to the previous session, not the new login.
    cookieStore.delete("atlas_active_tenant_id");

    // Store tokens in HTTP-only cookies
    cookieStore.set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day, adjust based on JWT expiration
    });

    cookieStore.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Do not log network exceptions that may contain credentials or tokens.
    console.error("Authentication request failed", { operation: "login" });
    return authFailure(email, authResponseError(503));
  }

  // Redirect after successfully setting cookies (must be outside try/catch)
  redirect(dashboardDestination((await headers()).get("referer")));
}

export async function register(
  prevState: unknown,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, fieldErrors } = validateAuthForm(formData, true);
  if (Object.keys(fieldErrors).length) {
    return authFailure(email, "Check the highlighted fields.", fieldErrors);
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authClientHeaders(await headers(), String(email)),
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return authFailure(email, authResponseError(res.status, true));
    }
  } catch {
    console.error("Authentication request failed", { operation: "register" });
    return authFailure(email, authResponseError(503, true));
  }

  // Auto-login or redirect to login
  redirect("/login?registered=true");
}

export async function logout() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (accessToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      console.error("Authentication request failed", { operation: "logout" });
    }
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  cookieStore.delete("atlas_active_tenant_id");

  redirect("/login");
}
