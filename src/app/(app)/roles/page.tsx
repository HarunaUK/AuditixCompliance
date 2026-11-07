import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Plus, Trash2, UserCog, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createRoleAction, deleteRoleAction } from "@/actions/isms";

export const metadata: Metadata = { title: "Roles & responsibilities" };
export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const roles = await db.ismsRole.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Clause 5.3"
        title="Roles & responsibilities"
        description="The ISMS roles that actually exist in this organisation, who holds them, what they are accountable for and what they can decide. Clause 5.3 expects this to be assigned and communicated, not assumed."
        actions={
          <Link href="/stage-1" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Stage 1 check
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Role assigned.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Role removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Role register</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Accountability for the management system, not the org chart.</p>
            </div>
            <Badge tone="outline">{roles.length} roles</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {roles.length ? (
              <div className="divide-y divide-line-soft">
                {roles.map((role) => (
                  <div key={role.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-violet/25 bg-violet/10 text-indigo-300">
                      <UserCog className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] font-medium text-ink">{role.role}</p>
                        {role.holder ? <Badge tone="violet">{role.holder}</Badge> : <Badge tone="amber">Holder not named</Badge>}
                        {role.reportsTo ? <span className="text-[10px] text-faint">Reports to {role.reportsTo}</span> : null}
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{role.responsibilities}</p>
                      {role.authority ? (
                        <p className="mt-1 text-[10px] leading-relaxed text-faint">
                          <span className="font-medium text-muted">Authority: </span>
                          {role.authority}
                        </p>
                      ) : null}
                    </div>
                    {writable ? (
                      <form action={deleteRoleAction} className="opacity-0 transition-opacity group-hover:opacity-100">
                        <input type="hidden" name="id" value={role.id} />
                        <DangerSubmit
                          variant="ghost"
                          size="icon"
                          className="size-7 text-faint hover:text-red-300"
                          message={`Remove the ${role.role} role?`}
                          aria-label="Remove role"
                        >
                          <Trash2 className="size-3.5" />
                        </DangerSubmit>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-12 text-center">
                <UsersRound className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No roles defined yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Clause 5.3 requires assigned and communicated ISMS roles. Add each role with who holds it, its
                  responsibilities and its authority.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Add role</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Name the accountability, then the person.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createRoleAction}>
              <Field label="Role *" htmlFor="role">
                <Input id="role" name="role" placeholder="e.g. ISMS Manager" required />
              </Field>
              <Field label="Held by" htmlFor="holder">
                <Input id="holder" name="holder" placeholder="e.g. Jane Doe" />
              </Field>
              <Field label="Responsibilities" htmlFor="responsibilities">
                <Textarea
                  id="responsibilities"
                  name="responsibilities"
                  rows={3}
                  placeholder="What this role is accountable for"
                  required
                />
              </Field>
              <Field label="Authority" htmlFor="authority">
                <Input id="authority" name="authority" placeholder="Decisions this role can make" />
              </Field>
              <Field label="Reports to" htmlFor="reportsTo" className="mb-0">
                <Input id="reportsTo" name="reportsTo" placeholder="e.g. CISO" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Adding…" disabled={!writable}>
                  <Plus className="size-3.5" /> Add role
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
