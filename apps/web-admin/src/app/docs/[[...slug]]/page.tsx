import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-article";
import { docPages } from "@/lib/docs";

type Props = { params: Promise<{ slug?: string[] }> };

function findPage(slug?: string[]) {
  return docPages.find((page) => page.slug === (slug ?? []).join("/"));
}

export function generateStaticParams() {
  return docPages.map((page) => ({ slug: page.slug ? [page.slug] : [] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findPage((await params).slug);
  return {
    title: page
      ? `${page.title} | ContentDock Docs`
      : "Page not found | ContentDock Docs",
    description: page?.description,
  };
}

export default async function DocumentationPage({ params }: Props) {
  const page = findPage((await params).slug);
  if (!page) notFound();
  return <DocsArticle page={page} />;
}
