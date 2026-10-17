"use server";
import { cookies } from "next/headers";
import { fetchCategories } from "@/lib/api";

export async function categoryOptions(page: number, search: string) {
  const store = await cookies();
  const token = store.get("access_token")?.value;
  const tenant = store.get("atlas_active_tenant_id")?.value;
  if (!token || !tenant)
    return { error: "Please sign in and select a workspace." };
  try {
    return {
      data: (await fetchCategories(
        token,
        tenant,
        Math.max(1, Math.floor(page)),
        search.slice(0, 100),
      )) as { id: string; name: string }[],
    };
  } catch {
    return { error: "Could not load categories. Please retry." };
  }
}
