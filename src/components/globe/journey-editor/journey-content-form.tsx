"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { updateContentAction } from "@/modules/journeys/journey.actions";
import { TIP_MAX_LENGTH } from "@/modules/journeys/journey.schema";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

const initial: FormState = {};

export function JourneyContentForm({ journey }: { journey: JourneyEditDto }) {
  const [state, action] = useActionState(updateContentAction, initial);
  const e = state.fieldErrors ?? {};
  // After a failed save, show what was typed — not the last saved version.
  const v = state.values;

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
          defaultValue={v?.description ?? journey.description ?? ""}
          invalid={!!e.description}
          placeholder="How the trip went, what you'd do differently, the moments that stuck…"
        />
      </Field>

      <Field
        label="Tips"
        htmlFor="tips"
        error={e.tips}
        hint={`One per line, up to ${TIP_MAX_LENGTH} characters each — short, practical things the next traveller should know.`}
      >
        <Textarea
          id="tips"
          name="tips"
          rows={5}
          defaultValue={v?.tips ?? journey.tips.join("\n")}
          invalid={!!e.tips}
          placeholder={"Book the bus a week ahead\nCarry cash — few places take cards"}
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save story &amp; tips</SubmitButton>
    </form>
  );
}
