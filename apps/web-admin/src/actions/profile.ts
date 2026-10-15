"use server";

import { cookies } from "next/headers";
import { updateProfile } from "@/lib/api";
import { privateFileUrl } from "@/lib/files";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(
  prevState: unknown,
  formData: FormData,
) {
  const firstName = formData.get("firstName")?.toString() || "";
  const lastName = formData.get("lastName")?.toString() || "";
  const bio = formData.get("bio")?.toString() || "";
  const avatarFile = formData.get("avatarFile") as File | null;
  let savedAvatarUrl: string | undefined;
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
        process.env.API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4000/api";
      const res = await fetch(`${API_URL}/users/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fileFormData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(". ")
            : body.message || "Failed to upload avatar",
        );
      }
      const uploaded = await res.json();
      savedAvatarUrl = privateFileUrl(uploaded.avatarUrl);
    }

    await updateProfile(token, userId, {
      firstName,
      lastName,
      bio,
    });

    // Revalidate dashboard layout so the updated profile info is fetched
    revalidatePath("/dashboard", "layout");

    return {
      success: "Profile updated successfully!",
      avatarUrl: savedAvatarUrl,
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
): Promise<{ error?: string; success?: string; timestamp: number }> {
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("newPassword") || "");
  const id = String(formData.get("userId") || "");
  if (!id || !currentPassword || !password)
    return {
      error: "All password fields are required.",
      timestamp: Date.now(),
    };
  try {
    const { workspaceRequest } = await import("@/lib/workspace-api");
    await workspaceRequest(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, password }),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update password.",
      timestamp: Date.now(),
    };
  }
  const jar = await cookies();
  jar.delete("access_token");
  jar.delete("refresh_token");
  const { redirect } = await import("next/navigation");
  return redirect("/login?passwordChanged=true");
}
