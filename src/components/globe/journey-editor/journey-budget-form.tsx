"use client";

import { useActionState } from "react";

import { ChoiceChip } from "@/components/ui/choice-chip";
import { Field, FormMessage, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { CURRENCIES, TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";
import type { FormState } from "@/lib/forms";
import { updateBudgetAction } from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

const initial: FormState = {};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function JourneyBudgetForm({ journey }: { journey: JourneyEditDto }) {
  const [state, action] = useActionState(updateBudgetAction, initial);
  const e = state.fieldErrors ?? {};
  const amount = journey.budgetAmount != null ? journey.budgetAmount / 100 : "";

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="journeyId" value={journey.id} />
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <div className="flex items-end gap-3">
        <Field
          label="Total budget"
          htmlFor="budgetAmount"
          error={e.budgetAmount}
          className="flex-1"
        >
          <Input
            id="budgetAmount"
            name="budgetAmount"
            type="number"
            min={0}
            step="1"
            defaultValue={amount}
            placeholder="15000"
            invalid={!!e.budgetAmount}
          />
        </Field>
        <Field label="Currency" htmlFor="budgetCurrency" className="w-28">
          <Select id="budgetCurrency" name="budgetCurrency" defaultValue={journey.budgetCurrency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <Label>Getting around</Label>
        <div className="flex flex-wrap gap-2">
          {TRANSPORT_MODES.map((m) => (
            <ChoiceChip
              key={m}
              type="checkbox"
              name="transportModes"
              value={m}
              label={cap(m)}
              defaultChecked={journey.transportModes.includes(m)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label>Travel style</Label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map((s) => (
            <ChoiceChip
              key={s}
              type="checkbox"
              name="travelStyle"
              value={s}
              label={s === "roadtrip" ? "Road trip" : cap(s)}
              defaultChecked={journey.travelStyle.includes(s)}
            />
          ))}
        </div>
      </fieldset>

      <SubmitButton pendingText="Saving…">Save budget &amp; style</SubmitButton>
    </form>
  );
}
