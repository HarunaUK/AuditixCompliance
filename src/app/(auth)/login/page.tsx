import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Auditix compliance workspace.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">Welcome back</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-ink">Sign in to Auditix</h1>
      <p className="mb-7 mt-1.5 text-[12.5px] text-muted">Pick up where your compliance work left off.</p>
      <LoginForm
        demo={{
          email: process.env.DEMO_EMAIL ?? "test@auditixcompliance.co.uk",
          password: process.env.DEMO_PASSWORD ?? "auditix-demo-2026",
        }}
      />
    </div>
  );
}
