import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Users,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const modules = [
  {
    icon: FileText,
    title: "Content & publishing",
    description:
      "Draft, organize, and publish articles with a shared editorial workspace.",
  },
  {
    icon: FolderOpen,
    title: "Media library",
    description:
      "Keep images and documents available to the people who need them.",
  },
  {
    icon: Users,
    title: "Workspace access",
    description:
      "Invite colleagues and assign administrator, editor, or viewer access.",
  },
  {
    icon: ScrollText,
    title: "Audit & exports",
    description:
      "Review workspace activity and download audit records for a selected period.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-12 border-b py-16 md:grid-cols-[1.2fr_1fr] md:gap-24 md:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              ContentDock
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Your content. Every workspace. One platform.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Manage content, files, and team access in one place. Keep each
              organization separate and every workspace easy to navigate.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button render={<Link href="/dashboard" />}>
                Open workspace
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" render={<Link href="/register" />}>
                Create an account
              </Button>
            </div>
          </div>
          <div className="self-center rounded-lg border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold">
              One account. Your workspaces.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Start a workspace for your organization, or sign in to accept an
              invitation from your administrator.
            </p>
            <ol className="mt-7 space-y-5 text-sm">
              {[
                "Create or join a workspace",
                "Organize categories and content",
                "Invite your team and manage access",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded border text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="grid gap-x-16 py-8 sm:grid-cols-2">
          {modules.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex gap-4 py-7">
              <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <span>
            ContentDock · Your content. Every workspace. One platform.
          </span>
          <Link href="/login" className="hover:text-foreground">
            Sign in to your organization
          </Link>
        </div>
      </footer>
    </div>
  );
}
