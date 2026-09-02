"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { CURRENCIES } from "@/lib/travel-vocab";
import { updateItineraryMetaAction } from "@/modules/itineraries/itinerary.actions";
import { ITINERARY_STATUSES } from "@/modules/itineraries/itinerary.schema";
import type { ItineraryEditDto } from "@/modules/itineraries/itinerary.mappers";

const initial: FormState = {};
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function ItineraryMetaForm({ itinerary }: { itinerary: ItineraryEditDto }) {
  const [state, action] = useActionState(updateItineraryMetaAction, initial);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="itineraryId" value={itinerary.id} />

      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <Field label="Title" htmlFor="title" error={e.title}>
        <Input
          id="title"
          name="title"
          required
          defaultValue={itinerary.title}
          invalid={!!e.title}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Destination" htmlFor="destinationName" error={e.destinationName}>
          <Input
            id="destinationName"
            name="destinationName"
            defaultValue={itinerary.destinationName ?? ""}
          />
        </Field>
        <Field label="Country" htmlFor="country" error={e.country}>
          <Input id="country" name="country" defaultValue={itinerary.country ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="startDate" error={e.startDate}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={day(itinerary.startDate)}
          />
        </Field>
        <Field label="End date" htmlFor="endDate" error={e.endDate}>
          <Input id="endDate" name="endDate" type="date" defaultValue={day(itinerary.endDate)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" error={e.status}>
          <Select id="status" name="status" defaultValue={itinerary.status}>
            {ITINERARY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Currency" htmlFor="currency" error={e.currency}>
          <Select id="currency" name="currency" defaultValue={itinerary.currency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" rows={3} defaultValue={itinerary.notes ?? ""} />
      </Field>

      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </form>
  );
}
