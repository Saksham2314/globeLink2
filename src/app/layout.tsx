import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { headers } from "next/headers";

import { ThemeWatcher } from "@/components/globe/theme-watcher";
import { SkipLink } from "@/components/ui/skip-link";
import { Splash } from "@/components/ui/splash";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "GlobeLink — Real journeys, thoughtfully planned",
    template: "%s · GlobeLink",
  },
  description:
    "GlobeLink is a travel platform built on trips that actually happened. Discover real journeys from other travellers, save the ones that inspire you, and plan your own.",
  applicationName: "GlobeLink",
  authors: [{ name: "GlobeLink" }],
  openGraph: {
    title: "GlobeLink — Real journeys, thoughtfully planned",
    description:
      "Discover real journeys from other travellers, save the ones that inspire you, and plan your own.",
    url: appUrl,
    siteName: "GlobeLink",
    type: "website",
  },
  robots: { index: true, follow: true },
};

// Dark is the default everywhere, so the browser chrome matches it.
export const viewport: Viewport = {
  themeColor: "#0d1219",
};

/**
 * Resolves the theme and stamps `<html>` BEFORE the body paints, so there is
 * never a flash of the wrong theme. Reads the `gl-theme` cookie first (set for
 * signed-in users and synced across devices), then localStorage — kept in sync
 * with src/lib/theme.ts. No stored choice → dark (DEFAULT_THEME_PREFERENCE).
 * It also marks the opening splash as seen, so it plays once per session.
 */
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)gl-theme=(light|dark|system)\\b/);var p=m?m[1]:localStorage.getItem("gl-theme");var dark=p==="light"?false:p==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:true;var r=dark?"dark":"light";var e=document.documentElement;e.dataset.theme=r;e.style.colorScheme=r;try{if(sessionStorage.getItem("gl-splash"))e.dataset.splash="seen";else sessionStorage.setItem("gl-splash","1");}catch(x){}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // Server-rendered as dark so even no-JS visitors start dark; the script
    // above swaps in a stored light/system choice before first paint.
    <html
      lang="en"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      className={cn(inter.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Browsers hide a nonce's value from the DOM after parsing (a CSP
            safeguard), so the hydrated `nonce=""` never matches the server. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {/* If JS never runs, scroll-reveal wrappers must not hide their content. */}
        <noscript>
          <style
            nonce={nonce}
          >{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body className="bg-bg text-ink min-h-dvh">
        <Splash />
        <ThemeWatcher />
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
