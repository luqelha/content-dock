"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Search, UserPlus, X } from "lucide-react";
import { inviteMember, changeMember } from "@/actions/workspace";
import { useTenant } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
export type Member = {
  userId: string;
  role: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  };
};
export function MembersClient({ members }: { members: Member[] }) {
  const { user } = useTenant();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  const [remove, setRemove] = useState<Member | null>(null);
  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          (!role || m.role === role) &&
          `${m.user.email} ${m.user.firstName || ""} ${m.user.lastName || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [members, query, role],
  );
  function change(member: Member, nextRole?: string) {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await changeMember(member.userId, nextRole);
      if (result.error) setError(result.error);
      else {
        setRemove(null);
        setNotice(nextRole ? "Member role updated." : "Member removed.");
        router.refresh();
      }
    });
  }
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can access this workspace and what they can do.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowInvite(!showInvite);
            setLink("");
          }}
        >
          <UserPlus className="size-4" />
          Invite member
        </Button>
      </div>
      <div className="flex flex-wrap gap-5 border-b pb-4 text-sm">
        <span>
          <strong>{members.length}</strong> members
        </span>
        <span className="text-muted-foreground">
          {members.filter((m) => m.role === "ADMIN").length} administrators
        </span>
        <span className="text-muted-foreground">
          {members.filter((m) => m.role === "EDITOR").length} editors
        </span>
      </div>
      {showInvite && (
        <form
          className="space-y-4 rounded-lg border bg-card p-5"
          action={(form) =>
            startTransition(async () => {
              setError("");
              const result = await inviteMember(form);
              if (result.error) setError(result.error);
              else if (result.data) {
                setLink(
                  `${window.location.origin}/dashboard/invitations?token=${result.data.token}`,
                );
                setNotice(
                  `Invitation created for ${result.data.email}. It expires in 7 days.`,
                );
              }
            })
          }
        >
          <div className="flex justify-between">
            <h2 className="text-sm font-semibold">Invite a colleague</h2>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Close invitation form"
              onClick={() => setShowInvite(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_160px_auto]">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="role"
                className="erp-select w-full"
                defaultValue="VIEWER"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              Create invitation
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Viewers read content. Editors create and publish. Administrators
            also manage access and workspace settings.
          </p>
          {link && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="invite-link">Share this invitation link</Label>
              <div className="flex gap-2">
                <Input id="invite-link" readOnly value={link} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setNotice("Invitation link copied.");
                    } catch {
                      setError("Copy the invitation link from the field.");
                    }
                  }}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The recipient must sign in with the invited email. No email has
                been sent automatically.
              </p>
            </div>
          )}
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2 size-4 text-muted-foreground" />
          <Input
            aria-label="Search members"
            placeholder="Search name or email…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by role"
          className="erp-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="ADMIN">Administrators</option>
          <option value="EDITOR">Editors</option>
          <option value="VIEWER">Viewers</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-5">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right pr-5">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => {
              const self = member.userId === (user?.id || user?.userId);
              return (
                <TableRow key={member.userId}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {(member.user.firstName || member.user.email)
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {[member.user.firstName, member.user.lastName]
                            .filter(Boolean)
                            .join(" ") || member.user.email}{" "}
                          {self && (
                            <Badge variant="outline" className="ml-2">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      aria-label={`Role for ${member.user.email}`}
                      className="erp-select"
                      value={member.role}
                      disabled={self || pending}
                      onChange={(e) => change(member, e.target.value)}
                    >
                      <option value="ADMIN">Administrator</option>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={self || pending}
                      onClick={() => setRemove(member)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground"
                >
                  No members match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          {filtered.length} of {members.length} members
        </div>
      </div>
      {remove && (
        <section
          role="alertdialog"
          aria-labelledby="remove-title"
          className="rounded-lg border border-destructive/30 p-5"
        >
          <h2 id="remove-title" className="text-sm font-semibold">
            Remove {remove.user.email}?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            They will lose access to this workspace. Their account and authored
            content will remain.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => change(remove)}
            >
              Remove member
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setRemove(null)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
