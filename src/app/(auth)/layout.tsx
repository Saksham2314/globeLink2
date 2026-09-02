import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6 md:px-8">
          <Link href="/" className="font-display text-ink text-lg tracking-tight">
            Globe<span className="text-accent">Link</span>
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
