import { CommandPalette } from "@/components/globe/command-palette";
import { SiteFooter } from "@/components/globe/site-footer";
import { SiteHeader } from "@/components/globe/site-header";
import { ThemeSync } from "@/components/globe/theme-sync";
import { UnverifiedStrip } from "@/components/globe/unverified-strip";
import { auth } from "@/lib/auth";
import type { ThemePreference } from "@/lib/theme";
import { getSessionUserSummary, getUserThemePreference } from "@/modules/users/user.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [savedTheme, summary] = userId
    ? await Promise.all([getUserThemePreference(userId), getSessionUserSummary(userId)])
    : [null, null];

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync serverPref={(savedTheme as ThemePreference | null) ?? null} />
      <SiteHeader />
      {summary && !summary.emailVerified ? <UnverifiedStrip /> : null}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {userId ? <CommandPalette /> : null}
    </div>
  );
}
