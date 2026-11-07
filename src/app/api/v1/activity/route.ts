import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { countActivity, isEntityType, listActivity, type EntityType } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const requestedType = url.searchParams.get("entityType") ?? undefined;
    const entityType: EntityType | "ALL" = isEntityType(requestedType) ? requestedType : "ALL";
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const take = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const filters = {
      entityType,
      actorName: url.searchParams.get("actor") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    };

    const [events, total] = await Promise.all([
      listActivity(context.workspaceId, { ...filters, take }),
      countActivity(context.workspaceId, filters),
    ]);

    return NextResponse.json({
      data: events,
      meta: { count: events.length, total, workspaceId: context.workspaceId, entityType },
    });
  });
}
