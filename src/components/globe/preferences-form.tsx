"use client";

import { useActionState } from "react";

import { ChoiceChip } from "@/components/ui/choice-chip";
import { Field, FormMessage, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms";
import { updatePreferencesAction } from "@/modules/users/user.actions";
import {
  BUDGET_TIERS,
  DIETARY,
  INTERESTS,
  TRAVEL_PACES,
  TRAVEL_STYLES,
} from "@/modules/users/user.schema";

const LABELS: Record<string, string> = {
  roadtrip: "Road trip",
  "gluten-free": "Gluten-free",
  shoestring: "Shoestring",
};

const label = (value: string) => LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

interface PreferencesFormProps {
  defaultValues: {
    styles: string[];
    pace: string | null;
    budgetTier: string | null;
    interests: string[];
    dietary: string[];
    homeRegion: string | null;
  };
}

const initialState: FormState = {};

export function PreferencesForm({ defaultValues }: PreferencesFormProps) {
  const [state, action] = useActionState(updatePreferencesAction, initialState);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <fieldset className="space-y-2">
        <Label>Travel style</Label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map((value) => (
            <ChoiceChip
              key={value}
              type="checkbox"
              name="styles"
              value={value}
              label={label(value)}
              defaultChecked={defaultValues.styles.includes(value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label>Pace</Label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_PACES.map((value) => (
            <ChoiceChip
              key={value}
              type="radio"
              name="pace"
              value={value}
              label={label(value)}
              defaultChecked={defaultValues.pace === value}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label>Budget</Label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_TIERS.map((value) => (
            <ChoiceChip
              key={value}
              type="radio"
              name="budgetTier"
              value={value}
              label={label(value)}
              defaultChecked={defaultValues.budgetTier === value}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label>Interests</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((value) => (
            <ChoiceChip
              key={value}
              type="checkbox"
              name="interests"
              value={value}
              label={label(value)}
              defaultChecked={defaultValues.interests.includes(value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label>Dietary</Label>
        <div className="flex flex-wrap gap-2">
          {DIETARY.map((value) => (
            <ChoiceChip
              key={value}
              type="checkbox"
              name="dietary"
              value={value}
              label={label(value)}
              defaultChecked={defaultValues.dietary.includes(value)}
            />
          ))}
        </div>
      </fieldset>

      <Field label="Home region" htmlFor="homeRegion" hint="Where you usually travel from.">
        <Input
          id="homeRegion"
          name="homeRegion"
          defaultValue={defaultValues.homeRegion ?? ""}
          placeholder="e.g. North India"
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save preferences</SubmitButton>
    </form>
  );
}
