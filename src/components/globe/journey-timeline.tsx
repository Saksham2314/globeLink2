import { formatMoney } from "@/lib/format";
import type { JourneyDetailDto } from "@/modules/journeys/journey.mappers";

type Day = JourneyDetailDto["days"][number];

const STOP_LABEL: Record<string, string> = {
  ACTIVITY: "Activity",
  TRANSIT: "Transit",
  LODGING: "Stay",
  FOOD: "Food",
  NOTE: "Note",
};

export function JourneyTimeline({ days }: { days: Day[] }) {
  if (days.length === 0) return null;

  return (
    <ol className="space-y-8">
      {days.map((day) => (
        <li key={day.dayNumber} className="border-border relative border-l pl-6">
          <span className="border-accent bg-bg absolute top-1 -left-[6px] size-3 rounded-full border-2" />
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="font-display text-ink text-lg">
              Day {day.dayNumber}
              {day.title ? <span className="text-muted"> · {day.title}</span> : null}
            </h3>
            {day.date ? (
              <span className="text-muted text-xs">
                {new Date(day.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ) : null}
          </div>

          {day.notes ? <p className="text-muted mt-1 text-sm">{day.notes}</p> : null}

          {day.stops.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {day.stops.map((stop, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted w-14 shrink-0 pt-0.5 text-xs">{stop.time ?? ""}</span>
                  <div className="min-w-0">
                    <p className="text-ink text-sm">
                      <span className="text-accent text-xs font-medium">
                        {STOP_LABEL[stop.type] ?? stop.type}
                      </span>{" "}
                      · {stop.title}
                    </p>
                    {stop.locationName ? (
                      <p className="text-muted text-xs">{stop.locationName}</p>
                    ) : null}
                    {stop.description ? (
                      <p className="text-muted mt-0.5 text-sm">{stop.description}</p>
                    ) : null}
                    {stop.cost != null ? (
                      <p className="text-muted mt-0.5 text-xs">
                        {formatMoney(stop.cost, stop.costCurrency ?? "INR")}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
