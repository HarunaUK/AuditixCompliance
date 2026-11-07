import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    return NextResponse.json({
      data: {
        user: { id: context.user.id, name: context.user.name, email: context.user.email },
        role: context.role,
        activeWorkspace: {
          id: context.membership.workspace.id,
          name: context.membership.workspace.name,
          slug: context.membership.workspace.slug,
          plan: context.membership.workspace.plan,
          planName: PLANS[context.membership.workspace.plan].name,
        },
        memberships: context.memberships.map((item) => ({
          workspaceId: item.workspace.id,
          name: item.workspace.name,
          slug: item.workspace.slug,
          plan: item.workspace.plan,
          role: item.role,
        })),
      },
    });
  });
}
