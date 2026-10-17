import {
  ListPagination,
  listPage,
} from "@/components/dashboard/list-pagination";
import { cookies } from "next/headers";
import { fetchMedia } from "@/lib/api";
import { MediaItem } from "@/actions/media";
import { MediaClient } from "@/components/dashboard/media/media-client";

export const metadata = {
  title: "Media Library | ContentDock Admin",
  description: "Manage, upload, and organize assets for your tenant.",
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = listPage((await searchParams).page);
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const activeTenantId = cookieStore.get("atlas_active_tenant_id")?.value;

  let mediaItems: MediaItem[] = [];

  if (token && activeTenantId) {
    mediaItems = await fetchMedia(token, activeTenantId, page);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <MediaClient
        key={`${activeTenantId}:${page}`}
        initialData={mediaItems}
        page={page}
      />
      <ListPagination
        page={page}
        hasNext={mediaItems.length === 50}
        path="/dashboard/media"
      />
    </div>
  );
}
