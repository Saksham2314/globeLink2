"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { updateBasicsAction } from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

const initial: FormState = {};

export function JourneyBasicsForm({ journey }: { journey: JourneyEditDto }) {
  const [state, action] = useActionState(updateBasicsAction, initial);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="journeyId" value={journey.id} />
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <Field label="Title" htmlFor="title" error={e.title}>
        <Input id="title" name="title" defaultValue={journey.title} required invalid={!!e.title} />
      </Field>

      <Field
        label="One-line summary"
        htmlFor="summary"
        error={e.summary}
        hint="Shown on cards and in search. Up to 280 characters."
      >
        <Textarea
          id="summary"
          name="summary"
          rows={2}
          defaultValue={journey.summary ?? ""}
          maxLength={280}
          invalid={!!e.summary}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" htmlFor="originName" error={e.originName}>
          <Input
            id="originName"
            name="originName"
            defaultValue={journey.originName ?? ""}
            placeholder="e.g. Delhi"
          />
        </Field>
        <Field label="Destination" htmlFor="destinationName" error={e.destinationName}>
          <Input
            id="destinationName"
            name="destinationName"
            defaultValue={journey.destinationName ?? ""}
            placeholder="e.g. Manali"
          />
        </Field>
        <Field label="Country" htmlFor="country" error={e.country}>
          <Input id="country" name="country" defaultValue={journey.country ?? ""} />
        </Field>
        <Field label="Region / state" htmlFor="region" error={e.region}>
          <Input id="region" name="region" defaultValue={journey.region ?? ""} />
        </Field>
      </div>

      <SubmitButton pendingText="Saving…">Save basics</SubmitButton>
    </form>
  );
}
