/** Display helpers — pure, usable on server or client. */

/** Integer minor units + ISO code → localized currency string. */
export function formatMoney(
  minorUnits: number | null | undefined,
  currency = "INR",
): string | null {
  if (minorUnits == null) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
    }).format(minorUnits / 100);
  } catch {
    return `${(minorUnits / 100).toLocaleString()} ${currency}`;
  }
}

/** "12–18 Mar 2026", "Mar 2026", or null. */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string | null {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return null;

  const d = (date: Date, withYear = true) =>
    date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });

  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();
    return `${d(s, !sameYear)} – ${d(e)}`;
  }
  return d((s ?? e) as Date);
}

/** "5 days" / "1 day" / null. */
export function formatDuration(days: number | null | undefined): string | null {
  if (!days || days < 1) return null;
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Compact "time ago" for conversation lists: "now", "4m", "3h", "2d", or a date. */
export function formatTimeAgo(input: string | Date): string {
  const then = new Date(input).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "now";
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h`;
  if (secs < 604800) return `${Math.round(secs / 86400)}d`;
  return new Date(input).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Today" / "Yesterday" / "Mon, 3 Mar" — for date separators in a chat log. */
export function formatDayLabel(input: string | Date): string {
  const d = new Date(input);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** "09:34" clock time for a single message. */
export function formatClock(input: string | Date): string {
  return new Date(input).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
