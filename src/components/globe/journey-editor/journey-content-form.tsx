"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { updateContentAction } from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

const initial: FormState = {};

export function JourneyContentForm({ journey }: { journey: JourneyEditDto }) {
  const [state, action] = useActionState(updateContentAction, initial);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="journeyId" value={journey.id} />
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <Field
        label="The story"
        htmlFor="description"
        error={e.description}
        hint="Markdown supported — headings, lists, links, quotes."
      >
        <Textarea
          id="description"
          name="description"
          rows={10}
          defaultValue={journey.description ?? ""}
          invalid={!!e.description}
          placeholder="How the trip went, what you'd do differently, the moments that stuck…"
        />
      </Field>

      <Field
        label="Tips"
        htmlFor="tips"
        error={e.tips}
        hint="One per line. Short, practical things the next traveller should know."
      >
        <Textarea
          id="tips"
          name="tips"
          rows={5}
          defaultValue={journey.tips.join("\n")}
          placeholder={"Book the bus a week ahead\nCarry cash — few places take cards"}
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save story &amp; tips</SubmitButton>
    </form>
  );
}
