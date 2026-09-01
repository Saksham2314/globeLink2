import { Container } from "@/components/ui/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="flex flex-col gap-3 py-10 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-ink text-base">
          Globe<span className="text-accent">Link</span>
        </p>
        <p className="text-muted text-xs">
          © {year} GlobeLink · A travel platform built on real journeys.
        </p>
      </Container>
    </footer>
  );
}
