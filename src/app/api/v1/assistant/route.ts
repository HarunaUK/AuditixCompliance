import { NextResponse } from "next/server";
import { AiError, aiConfigured, streamChat } from "@/lib/ai";
import { ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { assistantMessages, workspaceBrief } from "@/lib/services/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { messages?: { role?: string; content?: string }[] };

/**
 * Per-user throttle. The assistant spends real money per message, so a runaway
 * tab (or a scripted loop) should not be able to drain the account. In-memory is
 * enough for a single instance; a multi-instance deployment would move this to
 * Redis with the same key.
 */
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 40;
const usage = new Map<string, { count: number; resetAt: number }>();

function takeSlot(userId: string) {
  const now = Date.now();
  const entry = usage.get(userId);
  if (!entry || entry.resetAt < now) {
    usage.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await getApiContext(request);

    if (!aiConfigured()) {
      return NextResponse.json(
        {
          error: "AI is not configured. Add AI_API_KEY, AI_BASE_URL and AI_MODEL to the environment.",
          code: "ai_unconfigured",
        },
        { status: 503 },
      );
    }

    const body = await readJson<Body>(request);
    const history = Array.isArray(body.messages) ? body.messages : [];
    const last = history[history.length - 1];
    if (!last || last.role !== "user" || !String(last.content ?? "").trim()) {
      throw new ApiError(422, "Ask a question to start.", "empty_message");
    }

    if (!takeSlot(context.user.id)) {
      return NextResponse.json(
        { error: "You have reached the assistant limit for this hour. Try again later.", code: "rate_limited" },
        { status: 429 },
      );
    }

    const brief = await workspaceBrief(context.workspaceId);
    const stream = await streamChat(assistantMessages(history, brief.text), { maxTokens: 900 });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message, code: "ai_error" }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "The assistant is unavailable.", code: "internal_error" }, { status: 500 });
  }
}
