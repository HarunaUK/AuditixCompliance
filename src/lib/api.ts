import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveMembership, WORKSPACE_COOKIE } from "@/lib/workspace";
import type { MembershipSummary } from "@/lib/workspace";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type ApiContext = {
  user: { id: string; name: string; email: string; createdAt: Date };
  membership: MembershipSummary;
  memberships: MembershipSummary[];
  workspaceId: string;
  role: MembershipSummary["role"];
};

export async function getApiContext(request: Request): Promise<ApiContext> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to use the API.", "unauthorized");

  const url = new URL(request.url);
  const store = await cookies();
  const explicitWorkspace = request.headers.get("x-auditix-workspace") ?? url.searchParams.get("workspaceId");
  const requested = explicitWorkspace ?? store.get(WORKSPACE_COOKIE)?.value;
  const { memberships, membership } = await resolveMembership(user.id, requested);
  if (!membership) {
    throw new ApiError(404, "No workspace is available for this account.", "workspace_not_found");
  }
  if (explicitWorkspace && membership.workspace.id !== explicitWorkspace) {
    throw new ApiError(403, "You are not a member of that workspace.", "workspace_forbidden");
  }

  return {
    user,
    membership,
    memberships,
    workspaceId: membership.workspace.id,
    role: membership.role,
  };
}

export function assertSameOrigin(request: Request) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;

  // Compare against the Host the request actually arrived on. Next can report an
  // internal request URL (for example localhost while the browser used 127.0.0.1),
  // which made legitimate same-origin writes look cross-origin.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto ? `${forwardedProto}:` : new URL(request.url).protocol;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new ApiError(403, "Cross-origin writes are not allowed.", "origin_rejected");
  }
  if (parsed.host !== host || parsed.protocol !== protocol) {
    throw new ApiError(403, "Cross-origin writes are not allowed.", "origin_rejected");
  }
}

export async function apiHandler(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed.", code: "validation_error", issues: error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong.", code: "internal_error" }, { status: 500 });
  }
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Expected a JSON body.", "invalid_json");
  }
}
