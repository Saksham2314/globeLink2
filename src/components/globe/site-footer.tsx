import { ThemeControl } from "@/components/globe/theme-control";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-ink text-base">
          Globe<span className="text-accent">Link</span>
        </p>
        <p className="text-muted text-xs">
          © {year} GlobeLink · A travel platform built on real journeys.
        </p>
        <div className="w-full max-w-[13rem] md:w-auto">
          <ThemeControl variant="inline" />
        </div>
      </Container>
    </footer>
  );
}
