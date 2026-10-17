import { NextRequest, NextResponse } from "next/server";
const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";
type Tokens = { access_token: string; refresh_token: string };
function expired(token?: string) {
  try {
    return (
      !token ||
      JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp *
        1000 <=
        Date.now() + 30000
    );
  } catch {
    return true;
  }
}
async function renew(token: string) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error("Authentication service unavailable");
  return res.json() as Promise<Tokens>;
}
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/exports") ||
    pathname.startsWith("/api/files");
  let access = request.cookies.get("access_token")?.value;
  const refresh = request.cookies.get("refresh_token")?.value;
  let tokens: Tokens | null = null;
  if (expired(access) && refresh) {
    try {
      tokens = await renew(refresh);
      access = tokens?.access_token;
    } catch {
      return new NextResponse(
        "The authentication service is temporarily unavailable. Please retry.",
        { status: 503 },
      );
    }
  } else if (expired(access)) access = undefined;
  if (!access && protectedRoute) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(url);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }
  const originalSelection = request.cookies.get(
    "atlas_active_tenant_id",
  )?.value;
  let selected = originalSelection;
  if (
    access &&
    request.method === "GET" &&
    protectedRoute &&
    (!selected || pathname === "/dashboard")
  ) {
    try {
      const res = await fetch(`${API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${access}` },
        cache: "no-store",
      });
      if (res.ok) {
        const tenants = await res.json();
        if (!tenants.some((tenant: { id: string }) => tenant.id === selected))
          selected = tenants[0]?.id;
      }
    } catch {
      /* The page displays a recoverable service error. */
    }
  }
  if (tokens) {
    request.cookies.set("access_token", tokens.access_token);
    request.cookies.set("refresh_token", tokens.refresh_token);
  }
  if (selected) request.cookies.set("atlas_active_tenant_id", selected);
  else request.cookies.delete("atlas_active_tenant_id");
  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());
  const needsWorkspace =
    pathname.startsWith("/dashboard/") &&
    !pathname.startsWith("/dashboard/workspaces/new") &&
    !pathname.startsWith("/dashboard/invitations") &&
    !pathname.startsWith("/dashboard/profile");
  const response =
    access && ["/login", "/register"].includes(pathname)
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : access && needsWorkspace && !selected
        ? NextResponse.redirect(
            new URL("/dashboard/workspaces/new", request.url),
          )
        : NextResponse.next({ request: { headers } });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  if (tokens) {
    response.cookies.set("access_token", tokens.access_token, {
      ...options,
      maxAge: 86400,
    });
    response.cookies.set("refresh_token", tokens.refresh_token, {
      ...options,
      maxAge: 604800,
    });
  }
  // Server actions own their cookie updates (switch/create workspace). Do not
  // overwrite their Set-Cookie response with the selection from the request.
  if (request.method === "GET" && selected !== originalSelection) {
    if (selected)
      response.cookies.set("atlas_active_tenant_id", selected, {
        ...options,
        maxAge: 31536000,
      });
    else response.cookies.delete("atlas_active_tenant_id");
  }
  return response;
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/exports/:path*",
    "/api/files/:path*",
  ],
};
