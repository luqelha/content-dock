"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return {
      error: "Email and password are required",
      email: email?.toString(),
      timestamp: Date.now(),
    };
  }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.message || "Invalid credentials",
        email: email?.toString(),
        timestamp: Date.now(),
      };
    }

    const cookieStore = await cookies();

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
  } catch (error) {
    console.error("Login error:", error);
    return {
      error: "An unexpected error occurred. Please try again.",
      email: email?.toString(),
      timestamp: Date.now(),
    };
  }

  // Redirect after successfully setting cookies (must be outside try/catch)
  redirect("/dashboard");
}

export async function register(prevState: unknown, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!email || !password || !confirmPassword) {
    return {
      error: "All fields are required",
      email: email?.toString(),
      timestamp: Date.now(),
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match",
      email: email?.toString(),
      timestamp: Date.now(),
    };
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.message || "Registration failed",
        email: email?.toString(),
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.error("Register error:", error);
    return {
      error: "An unexpected error occurred. Please try again.",
      email: email?.toString(),
      timestamp: Date.now(),
    };
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
      });
    } catch (error) {
      console.error("Logout error on backend:", error);
    }
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  redirect("/login");
}
