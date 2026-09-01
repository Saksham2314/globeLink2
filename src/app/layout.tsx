import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(inter.variable, fraunces.variable)} suppressHydrationWarning>
      <head>
        {/* If JS never runs, scroll-reveal wrappers must not hide their content. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body className="bg-bg text-ink min-h-dvh">{children}</body>
    </html>
  );
}
