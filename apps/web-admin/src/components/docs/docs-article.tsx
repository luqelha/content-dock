import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Info } from "lucide-react";
import { docHref, docPages, type DocPage } from "@/lib/docs";
import { DocsToc } from "./docs-toc";

export function DocsArticle({ page }: { page: DocPage }) {
  const index = docPages.indexOf(page);
  const previous = docPages[index - 1];
  const next = docPages[index + 1];
  const sections = page.sections.map(({ id, title }) => ({ id, title }));

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_200px]">
      <main
        id="docs-content"
        tabIndex={-1}
        className="min-w-0 px-5 py-8 outline-none sm:px-10 sm:py-10 lg:px-12 xl:px-14"
      >
        <article className="mx-auto max-w-[720px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-7 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Link
              href="/docs"
              className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Docs
            </Link>
            <ChevronRight className="size-3" />
            <span>{page.group}</span>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {page.description}
          </p>
          <details className="mt-7 rounded-md border px-4 py-3 xl:hidden">
            <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
              On this page
            </summary>
            <ul className="mt-3 space-y-2 pb-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-9 space-y-11 border-t pt-9 sm:mt-10 sm:pt-10">
            {page.sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <h2
                  id={section.id}
                  className="group scroll-mt-24 text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  <a
                    href={`#${section.id}`}
                    className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {section.title}
                    <span
                      aria-hidden="true"
                      className="ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      #
                    </span>
                  </a>
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-sm leading-7 text-muted-foreground sm:text-[15px]"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.steps && (
                  <ol className="mt-6 space-y-0">
                    {section.steps.map((step, stepIndex) => (
                      <li
                        key={step.title}
                        className="relative flex gap-4 pb-7 last:pb-0"
                      >
                        {stepIndex < section.steps!.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="absolute top-8 bottom-1 left-3.5 border-l"
                          />
                        )}
                        <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-xs font-medium">
                          {stepIndex + 1}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="text-sm font-semibold">
                            {step.title}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {section.table && (
                  <div className="mt-5 overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <caption className="sr-only">{section.title}</caption>
                      <thead className="bg-muted/50">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="border-b px-4 py-3 text-xs font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row[0]} className="border-b last:border-b-0">
                            {row.map((cell, cellIndex) =>
                              cellIndex === 0 ? (
                                <th
                                  key={cellIndex}
                                  scope="row"
                                  className="px-4 py-3 align-top text-xs leading-6 font-medium"
                                >
                                  {cell}
                                </th>
                              ) : (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-3 align-top text-xs leading-6 text-muted-foreground"
                                >
                                  {cell}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.note && (
                  <aside className="mt-6 flex gap-3 rounded-md border bg-muted/25 p-4 sm:p-5">
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {section.note.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {section.note.text}
                      </p>
                    </div>
                  </aside>
                )}
                {section.links && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group rounded-lg border p-5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                          {link.title}
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {link.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
          <nav
            aria-label="Documentation pagination"
            className="mt-14 grid grid-cols-2 gap-4 border-t pt-6"
          >
            {previous ? (
              <Link
                href={docHref(previous.slug)}
                className="group rounded-md border p-4 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3" />
                  Previous
                </span>
                <span className="mt-2 block text-sm font-medium">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next && (
              <Link
                href={docHref(next.slug)}
                className="group rounded-md border p-4 text-right hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  Next
                  <ArrowRight className="size-3" />
                </span>
                <span className="mt-2 block text-sm font-medium">
                  {next.title}
                </span>
              </Link>
            )}
          </nav>
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 pb-2 text-xs text-muted-foreground">
            <span>ContentDock documentation</span>
            <Link
              href="/docs/troubleshooting"
              className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Need help? Troubleshooting
            </Link>
          </footer>
        </article>
      </main>
      <aside className="hidden xl:block">
        <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-12 pr-6">
          <DocsToc key={page.slug} sections={sections} />
          <div className="mt-8 border-t pt-5">
            <p className="text-xs font-medium">Ready to try it?</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Put the guide into practice in your workspace.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-xs font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Open ContentDock
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
