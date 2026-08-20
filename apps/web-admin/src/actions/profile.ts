"use server";

import { cookies } from "next/headers";
import { updateProfile } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(
  prevState: unknown,
  formData: FormData,
) {
  const firstName = formData.get("firstName")?.toString() || "";
  const lastName = formData.get("lastName")?.toString() || "";
  const bio = formData.get("bio")?.toString() || "";
  let avatarUrl = formData.get("avatarUrl")?.toString() || "";
  const avatarFile = formData.get("avatarFile") as File | null;
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    return {
      error: "User ID is missing",
      timestamp: Date.now(),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return {
      error: "Not authenticated",
      timestamp: Date.now(),
    };
  }

  try {
    if (avatarFile && avatarFile.size > 0) {
      // Create a FormData to send to the NestJS API
      const fileFormData = new FormData();
      fileFormData.append("file", avatarFile);

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${API_URL}/users/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fileFormData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload avatar");
      }

      const data = await res.json();
      avatarUrl = data.avatarUrl;
    }

    await updateProfile(token, userId, {
      firstName,
      lastName,
      bio,
      ...(avatarUrl ? { avatarUrl } : {}),
    });

    // Revalidate dashboard layout so the updated profile info is fetched
    revalidatePath("/dashboard", "layout");

    return {
      success: "Profile updated successfully!",
      timestamp: Date.now(),
    };
  } catch (error: unknown) {
    console.error("Failed to update profile:", error);
    return {
      error: (error as Error).message || "Failed to update profile",
      timestamp: Date.now(),
    };
  }
}

export async function updateUserPassword(
  prevState: unknown,
  formData: FormData,
) {
  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();
  const userId = formData.get("userId")?.toString();

  if (!userId || !currentPassword || !newPassword) {
    return {
      error: "Missing required fields",
      timestamp: Date.now(),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return {
      error: "Not authenticated",
      timestamp: Date.now(),
    };
  }

  try {
    // We can verify current password by making a login request
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    // We first need the user's email to login. Since we don't have it in the form,
    // let's fetch the profile to get the email.
    const profileRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileRes.ok) {
      return { error: "Failed to fetch user profile", timestamp: Date.now() };
    }

    const user = await profileRes.json();

    // Verify current password via login API
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: currentPassword }),
    });

    if (!loginRes.ok) {
      return { error: "Incorrect current password", timestamp: Date.now() };
    }

    // Current password is correct, update to new password
    await updateProfile(token, userId, {
      password: newPassword,
    });

    return {
      success: "Password updated successfully!",
      timestamp: Date.now(),
    };
  } catch (error: unknown) {
    console.error("Failed to update password:", error);
    return {
      error: (error as Error).message || "Failed to update password",
      timestamp: Date.now(),
    };
  }
}
