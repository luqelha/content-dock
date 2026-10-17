import { SiteHeader } from "@/components/site-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#docs-content" className="skip-link">
        Skip to documentation
      </a>
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] lg:flex">
        <DocsSidebar />
        {children}
      </div>
    </div>
  );
}
