"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { registerAction, type AuthState } from "@/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, null);

  return (
    <>
      {state?.error ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-[11.5px] leading-relaxed text-red-200">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <form action={formAction}>
        <Field label="Your name" htmlFor="name" error={state?.fields?.name?.[0]}>
          <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required />
        </Field>
        <Field label="Work email" htmlFor="email" error={state?.fields?.email?.[0]}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state?.fields?.password?.[0]} hint="At least 10 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a strong password"
            minLength={10}
            required
          />
        </Field>
        <Field
          label="Workspace name"
          htmlFor="workspaceName"
          error={state?.fields?.workspaceName?.[0]}
          hint="Your organization, or a client you are advising."
        >
          <Input id="workspaceName" name="workspaceName" placeholder="Northwind Cloud Ltd" required />
        </Field>
        <SubmitButton variant="primary" className="mt-2 w-full" pendingText="Creating workspace…">
          Create workspace <ArrowRight className="size-3.5" />
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-[9.5px] leading-relaxed text-faint">
        By continuing you agree to the acceptable use and privacy terms. Your workspace starts on the Growth plan; you can change it later.
      </p>

      <p className="mt-6 text-center text-[11.5px] text-faint">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sky-200 hover:text-sky-100">
          Sign in
        </Link>
      </p>
    </>
  );
}
