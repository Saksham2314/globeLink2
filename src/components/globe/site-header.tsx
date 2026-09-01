import Link from "next/link";

import { Container } from "@/components/ui/container";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Journeys", href: "#featured" },
  { label: "The assistant", href: "#assistant" },
];

export function SiteHeader() {
  return (
    <header className="border-border bg-bg/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-ink text-lg tracking-tight"
          aria-label="GlobeLink home"
        >
          Globe<span className="text-accent">Link</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted hover:text-ink text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span className="border-border bg-surface-muted text-muted rounded-full border px-3 py-1 text-xs font-medium">
          Private beta
        </span>
      </Container>
    </header>
  );
}
