"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms";
import { updateProfileAction } from "@/modules/users/user.actions";

interface ProfileFormProps {
  defaultValues: { name: string; handle: string; bio: string };
}

const initialState: FormState = {};

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [state, action] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          required
          invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field
        label="Handle"
        htmlFor="handle"
        error={state.fieldErrors?.handle}
        hint="Your profile lives at /profile/your-handle"
      >
        <Input
          id="handle"
          name="handle"
          defaultValue={defaultValues.handle}
          required
          invalid={Boolean(state.fieldErrors?.handle)}
        />
      </Field>

      <Field
        label="Bio"
        htmlFor="bio"
        error={state.fieldErrors?.bio}
        hint="A sentence or two. Up to 400 characters."
      >
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultValues.bio}
          maxLength={400}
          className="border-border-strong bg-surface text-ink placeholder:text-muted/70 focus-visible:ring-accent focus-visible:ring-offset-bg w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
