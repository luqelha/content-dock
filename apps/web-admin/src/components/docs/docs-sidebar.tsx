"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, ChevronDown, Search, X } from "lucide-react";
import { docGroups, docHref, docPages } from "@/lib/docs";
import { cn } from "@/lib/utils";

const searchEntries = docPages.flatMap((page) => [
  {
    title: page.title,
    context: page.group,
    href: docHref(page.slug),
    text: `${page.title} ${page.description}`,
  },
  ...page.sections.map((section) => ({
    title: section.title,
    context: page.title,
    href: `${docHref(page.slug)}#${section.id}`,
    text: [
      page.title,
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.steps ?? []).map(
        (step) => `${step.title} ${step.description}`,
      ),
      section.note?.text ?? "",
      ...(section.table?.rows ?? []).flat(),
    ].join(" "),
  })),
]);

export function DocsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = searchTerms.length
    ? searchEntries
        .filter((entry) =>
          searchTerms.every((term) => entry.text.toLowerCase().includes(term)),
        )
        .sort(
          (a, b) =>
            Number(b.title.toLowerCase().includes(query.trim().toLowerCase())) -
            Number(a.title.toLowerCase().includes(query.trim().toLowerCase())),
        )
        .slice(0, 8)
    : [];
  const current = docPages.find((page) => docHref(page.slug) === pathname);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function closeNavigation() {
    setOpen(false);
    setQuery("");
  }

  return (
    <aside
      className="border-b lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 xl:w-64"
      aria-label="Documentation sidebar"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="docs-navigation"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-sm focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
      >
        <BookOpen className="size-4 text-muted-foreground" />
        <span>Documentation</span>
        <span className="ml-auto truncate text-xs text-muted-foreground">
          {current?.title}
        </span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        id="docs-navigation"
        className={cn(
          "flex-col px-5 py-6 lg:flex lg:px-6 lg:py-8",
          open ? "flex" : "hidden",
        )}
      >
        <form
          role="search"
          aria-label="Search documentation"
          onSubmit={(event) => {
            event.preventDefault();
            if (results[0]) {
              router.push(results[0].href);
              closeNavigation();
            }
          }}
        >
          <label htmlFor="docs-search" className="sr-only">
            Search documentation
          </label>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              id="docs-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search docs..."
              className="h-9 w-full min-w-0 rounded-md border bg-muted/35 pr-10 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-2 rounded border bg-background px-1 text-[10px] text-muted-foreground"
              >
                ⌘ K
              </kbd>
            )}
          </div>
        </form>
        {searchTerms.length > 0 ? (
          <div className="mt-6">
            <p role="status" className="mb-3 text-xs text-muted-foreground">
              {results.length
                ? `${results.length === 8 ? "Top 8" : results.length} results`
                : "No results found"}
            </p>
            {results.length ? (
              <ul className="space-y-1">
                {results.map((result) => (
                  <li key={result.href}>
                    <Link
                      href={result.href}
                      onClick={closeNavigation}
                      className="block rounded-md px-2 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="block text-sm font-medium">
                        {result.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {result.context}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Try a topic such as publishing, invitations, or media.
              </p>
            )}
          </div>
        ) : (
          <nav aria-label="Documentation" className="mt-7 space-y-7">
            {docGroups.map((group) => (
              <div key={group}>
                <p className="mb-2 px-2 text-xs font-semibold">{group}</p>
                <ul className="space-y-0.5">
                  {docPages
                    .filter((page) => page.group === group)
                    .map((page) => (
                      <li key={page.slug}>
                        <Link
                          href={docHref(page.slug)}
                          onClick={closeNavigation}
                          aria-current={
                            pathname === docHref(page.slug) ? "page" : undefined
                          }
                          className={cn(
                            "block rounded-md px-2 py-2 text-[13px] transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                            pathname === docHref(page.slug)
                              ? "bg-accent font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {page.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
        <Link
          href="/dashboard"
          className="mt-8 flex items-center justify-between gap-2 border-t px-2 pt-5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          Go to your workspace
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
