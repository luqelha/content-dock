import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add the routes you want to protect here
const protectedRoutes = ["/dashboard"];
// Routes that are strictly for authentication
const authRoutes = ["/login", "/register"];

export default function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // Check if the current route is protected
  const isProtectedRoute =
    protectedRoutes.includes(pathname) || pathname.startsWith("/dashboard");

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.includes(pathname);

  if (isProtectedRoute && !accessToken) {
    // Redirect to login if accessing a protected route without a token
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && accessToken) {
    // Redirect to dashboard if trying to access login/register while authenticated
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
