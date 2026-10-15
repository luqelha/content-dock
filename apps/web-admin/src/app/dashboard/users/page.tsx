import {
  ListPagination,
  listPage,
} from "@/components/dashboard/list-pagination";
import { workspaceRequest } from "@/lib/workspace-api";
import { cookies } from "next/headers";
import {
  MembersClient,
  type Member,
} from "@/components/dashboard/members-client";
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = listPage((await searchParams).page);
  const id = (await cookies()).get("atlas_active_tenant_id")?.value;
  if (!id) return <p className="p-6">Select a workspace first.</p>;
  const tenants =
    await workspaceRequest<{ id: string; role: string }[]>("/tenants");
  if (tenants.find((t) => t.id === id)?.role !== "ADMIN")
    return (
      <p className="p-6">Administrator access is required to manage members.</p>
    );
  const members = await workspaceRequest<Member[]>(
    `/tenants/${id}/members?page=${page}&take=50`,
  );
  return (
    <>
      <MembersClient key={`${id}:${page}`} members={members} />
      <ListPagination
        page={page}
        hasNext={members.length === 50}
        path="/dashboard/users"
      />
    </>
  );
}
