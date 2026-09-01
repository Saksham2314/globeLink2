"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms";
import { createJourneyAction } from "@/modules/journeys/journey.actions";

const initial: FormState = {};

export function NewJourneyForm() {
  const [state, action] = useActionState(createJourneyAction, initial);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} />

      <Field label="Title" htmlFor="title" error={e.title}>
        <Input
          id="title"
          name="title"
          required
          invalid={!!e.title}
          placeholder="Four days in Manali on a budget"
        />
      </Field>

      <Field
        label="Destination"
        htmlFor="destinationName"
        error={e.destinationName}
        hint="Optional — you can set this later."
      >
        <Input id="destinationName" name="destinationName" placeholder="Manali" />
      </Field>

      <SubmitButton pendingText="Creating…">Create draft</SubmitButton>
    </form>
  );
}
