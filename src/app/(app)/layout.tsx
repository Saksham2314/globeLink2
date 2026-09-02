import { SiteFooter } from "@/components/globe/site-footer";
import { SiteHeader } from "@/components/globe/site-header";
import { ThemeSync } from "@/components/globe/theme-sync";
import { auth } from "@/lib/auth";
import type { ThemePreference } from "@/lib/theme";
import { getUserThemePreference } from "@/modules/users/user.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const savedTheme = session?.user?.id ? await getUserThemePreference(session.user.id) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync serverPref={(savedTheme as ThemePreference | null) ?? null} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
