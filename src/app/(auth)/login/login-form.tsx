"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, KeyRound } from "lucide-react";
import { loginAction, type AuthState } from "@/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ demo }: { demo: { email: string; password: string } }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      {state?.error ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-[11.5px] leading-relaxed text-red-200">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-1">
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <SubmitButton variant="primary" className="mt-2 w-full" pendingText="Signing in…">
          Sign in <ArrowRight className="size-3.5" />
        </SubmitButton>
      </form>

      <button
        type="button"
        onClick={() => {
          setEmail(demo.email);
          setPassword(demo.password);
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[10.5px] text-faint transition-colors hover:border-brand/30 hover:text-sky-200"
      >
        <KeyRound className="size-3.5" /> Fill demo credentials
      </button>

      <div className="mt-6 rounded-xl border border-line bg-panel/60 p-3.5">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">Demo workspace</p>
        <p className="mt-1.5 font-mono text-[10.5px] leading-relaxed text-muted">
          {demo.email}
          <br />
          {demo.password}
        </p>
        <p className="mt-2 text-[9.5px] leading-relaxed text-faint">
          Two seeded workspaces, eight policies and a live risk register.
        </p>
      </div>

      <p className="mt-6 text-center text-[11.5px] text-faint">
        New to Auditix?{" "}
        <Link href="/register" className="font-medium text-sky-200 hover:text-sky-100">
          Create a workspace
        </Link>
      </p>
      <p className="mt-5 text-center text-[9.5px] text-faint">
        Protected by signed, HttpOnly sessions · Tenant-isolated data
      </p>
    </>
  );
}
