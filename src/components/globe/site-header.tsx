import Link from "next/link";

import { UserMenu } from "@/components/globe/user-menu";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { getSessionUserSummary } from "@/modules/users/user.service";

interface NavLink {
  label: string;
  href: string;
}

export async function SiteHeader({ nav = [] }: { nav?: NavLink[] }) {
  const session = await auth();
  const user = session?.user?.id ? await getSessionUserSummary(session.user.id) : null;

  return (
    <header className="border-border bg-bg/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-ink text-lg tracking-tight"
            aria-label="GlobeLink home"
          >
            Globe<span className="text-accent">Link</span>
          </Link>
          <Link
            href="/explore"
            className="text-muted hover:text-ink text-sm font-medium transition-colors"
          >
            Explore
          </Link>
        </div>

        {nav.length > 0 ? (
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted hover:text-ink text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link href="/journeys/new">Create</Link>
              </Button>
              <UserMenu name={user.name} handle={user.handle} image={user.image} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted hover:text-ink text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
