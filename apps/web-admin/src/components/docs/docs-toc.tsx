"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DocsToc({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    const update = () => {
      const current = elements
        .filter((element) => element.getBoundingClientRect().top <= 160)
        .at(-1);
      setActive(current?.id ?? elements[0]?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [sections]);

  return (
    <nav aria-label="On this page" className="text-xs">
      <p className="mb-4 font-semibold text-foreground">On this page</p>
      <ul className="space-y-3 border-l">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
              onClick={() => setActive(section.id)}
              className={cn(
                "-ml-px block border-l pl-4 leading-5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                active === section.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
