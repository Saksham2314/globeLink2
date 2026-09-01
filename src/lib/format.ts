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
