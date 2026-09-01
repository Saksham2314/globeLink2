"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInAction } from "@/modules/auth/auth.actions";
import type { FormState } from "@/lib/forms";

const initialState: FormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <FormMessage error={state.error} />

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-muted text-center text-sm">
        New to GlobeLink?{" "}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
