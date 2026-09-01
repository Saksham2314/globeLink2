import { formatDateRange, formatDuration, formatMoney } from "@/lib/format";
import type { JourneyDetailDto } from "@/modules/journeys/journey.mappers";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function JourneyStatRow({ journey }: { journey: JourneyDetailDto }) {
  const stats: { label: string; value: string }[] = [];

  const dates = formatDateRange(journey.startDate, journey.endDate);
  if (dates) stats.push({ label: "When", value: dates });

  const duration = formatDuration(journey.durationDays);
  if (duration) stats.push({ label: "Duration", value: duration });

  const budget = formatMoney(journey.budgetAmount, journey.budgetCurrency);
  if (budget) stats.push({ label: "Budget", value: budget });

  if (journey.transportModes.length) {
    stats.push({ label: "Transport", value: journey.transportModes.map(cap).join(", ") });
  }
  const route = [journey.originName, journey.destinationName].filter(Boolean).join(" → ");
  if (route) stats.push({ label: "Route", value: route });

  if (stats.length === 0) return null;

  return (
    <dl className="border-border grid grid-cols-2 gap-x-6 gap-y-4 border-y py-5 sm:grid-cols-3 md:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            {s.label}
          </dt>
          <dd className="text-ink mt-1 text-sm">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
