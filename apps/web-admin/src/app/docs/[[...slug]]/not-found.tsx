import Link from "next/link";

export default function DocNotFound() {
  return (
    <main id="docs-content" className="min-w-0 flex-1 px-6 py-16 sm:px-12">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Guide not found
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Choose a topic from the sidebar or return to the documentation.
      </p>
      <Link
        href="/docs"
        className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
      >
        Back to documentation
      </Link>
    </main>
  );
}
