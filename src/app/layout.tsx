import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { headers } from "next/headers";

import { SkipLink } from "@/components/ui/skip-link";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1219" },
  ],
};

/**
 * Resolves the theme and stamps `<html>` BEFORE the body paints, so there is
 * never a flash of the wrong theme. Reads the `gl-theme` cookie first (set for
 * signed-in users and synced across devices), then localStorage — kept in sync
 * with src/lib/theme.ts.
 */
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)gl-theme=(light|dark|system)\\b/);var p=m?m[1]:localStorage.getItem("gl-theme");var dark=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=dark?"dark":"light";var e=document.documentElement;e.dataset.theme=r;e.style.colorScheme=r;}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={cn(inter.variable, fraunces.variable)} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* If JS never runs, scroll-reveal wrappers must not hide their content. */}
        <noscript>
          <style
            nonce={nonce}
          >{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body className="bg-bg text-ink min-h-dvh">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
