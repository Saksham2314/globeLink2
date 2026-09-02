"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A one-line nudge shown to signed-in users who haven't confirmed their email.
 *  Hidden on the pages that already handle it. */
export function UnverifiedStrip() {
  const pathname = usePathname();
  if (pathname === "/verify-email" || pathname.startsWith("/settings")) return null;

  return (
    <div className="border-accent/30 bg-accent-soft text-ink border-b px-4 py-1.5 text-center text-xs">
      Confirm your email to unlock itineraries, the assistant and messaging.{" "}
      <Link href="/verify-email" className="text-accent font-medium hover:underline">
        Verify now
      </Link>
    </div>
  );
}
