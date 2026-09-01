"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms";
import { updateRouteAction } from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

const initial: FormState = {};
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function JourneyRouteForm({ journey }: { journey: JourneyEditDto }) {
  const [state, action] = useActionState(updateRouteAction, initial);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="journeyId" value={journey.id} />
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="startDate" error={e.startDate}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInput(journey.startDate)}
          />
        </Field>
        <Field label="End date" htmlFor="endDate" error={e.endDate}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInput(journey.endDate)}
            invalid={!!e.endDate}
          />
        </Field>
      </div>

      <Field
        label="Or just the length"
        htmlFor="durationDays"
        error={e.durationDays}
        hint="Used only when you haven't given exact dates. Derived from the dates otherwise."
      >
        <Input
          id="durationDays"
          name="durationDays"
          type="number"
          min={1}
          max={365}
          defaultValue={journey.durationDays ?? ""}
          className="max-w-32"
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save dates</SubmitButton>
    </form>
  );
}
