import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create a workspace",
  description: "Create your Auditix workspace and start mapping controls, policies and evidence.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">Get started</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-ink">Create your workspace</h1>
      <p className="mb-7 mt-1.5 text-[12.5px] text-muted">
        You will land in a working compliance workspace with the baseline policies and control set ready.
      </p>
      <RegisterForm />
    </div>
  );
}
