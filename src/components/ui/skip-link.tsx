/** Keyboard-only "skip to main content" link. Visually hidden until focused. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-accent text-accent-contrast focus-visible:ring-accent sr-only z-[100] rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      Skip to content
    </a>
  );
}
