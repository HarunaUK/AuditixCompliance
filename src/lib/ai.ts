import "server-only";

/**
 * Thin OpenAI-compatible client.
 *
 * Any provider that speaks /chat/completions works: OpenAI, Z.ai, OpenRouter,
 * Groq, the Freebuff API. Point AI_BASE_URL + AI_MODEL at whichever one the
 * deployment uses so no vendor SDK is baked into the app.
 *
 * Two modes:
 * - Keyed: set AI_API_KEY (+ base/model) for OpenAI, Z.ai, Groq, OpenRouter…
 * - Keyless: set AI_KEYLESS=1 to use a free OpenAI-compatible endpoint such as
 *   Pollinations, which needs no account. Those tiers are rate limited, so the
 *   error surfaced to the user explains the limit rather than failing silently.
 */

export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const BASE_URL = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
const API_KEY = process.env.AI_API_KEY ?? "";
const KEYLESS = process.env.AI_KEYLESS === "1";
// Reasoning models spend their completion budget deliberating before they write.
// On a free tier that budget is small, so the keyless default asks for minimal
// reasoning; set AI_REASONING_EFFORT="" to let the provider decide.
const REASONING_EFFORT = process.env.AI_REASONING_EFFORT ?? (KEYLESS ? "low" : "");

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

export function aiConfigured() {
  return API_KEY.length > 0 || KEYLESS;
}

function assertConfigured() {
  if (!aiConfigured()) {
    throw new AiError(
      "AI is not configured. Add AI_API_KEY, or set AI_KEYLESS=1 with a free endpoint, to enable the assistant.",
      503,
    );
  }
}

function jsonErrorCode(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string }; code?: string };
    return parsed.error?.code ?? parsed.code;
  } catch {
    return undefined;
  }
}

function jsonErrorMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return (parsed.error?.message ?? parsed.message)?.slice(0, 240);
  } catch {
    return undefined;
  }
}

function rateLimitMessage(detail: string) {
  if (/FREE_LIMIT|rate.?limit|too many requests/i.test(detail)) {
    return "This free AI tier is rate limited (one reply every 45 seconds per IP). Wait a moment and try again, or add your own API key for unlimited use.";
  }
  return null;
}

async function request(body: Record<string, unknown>, signal?: AbortSignal) {
  assertConfigured();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: AI_MODEL,
      ...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {}),
      ...body,
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const limited = rateLimitMessage(detail);
    if (limited) throw new AiError(limited, 429);
    const code = jsonErrorCode(detail);
    if (code === "output_token_limit_exceeded") {
      throw new AiError(
        "The model ran out of output space before finishing — it spends part of its budget reasoning. Try a shorter brief, or use a larger model via AI_MODEL.",
        502,
      );
    }
    if (response.status === 401) throw new AiError("The AI provider rejected the API key.", 502);
    // Provider bodies are JSON and noisy; surface their message, not the envelope.
    const message = jsonErrorMessage(detail) ?? detail.slice(0, 240);
    throw new AiError(`The AI provider returned an error (${response.status})${message ? `: ${message}` : ""}`, 502);
  }

  return response;
}

/**
 * Streams plain text deltas. The browser reads this as a text/plain body, which
 * keeps the client simple and avoids exposing provider-specific SSE framing.
 */
export async function streamChat(messages: ChatMessage[], options: { maxTokens?: number; signal?: AbortSignal } = {}) {
  const response = await request(
    {
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: options.maxTokens ?? 900,
    },
    options.signal,
  );

  if (!response.body) throw new AiError("The AI provider returned an empty stream.", 502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload);
              const delta: string | undefined = chunk.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // Ignore keep-alives and provider-specific frames.
            }
          }
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `\n\n_${error instanceof Error ? error.message : "The assistant stopped responding."}_`,
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
}

/**
 * Non-streaming completion constrained to JSON. Providers that do not support
 * response_format fall back to plain text, and the caller validates the shape.
 */
export async function completeJson<T>(messages: ChatMessage[], options: { maxTokens?: number } = {}): Promise<T> {
  const base = {
    messages,
    temperature: 0.5,
    max_tokens: options.maxTokens ?? 2400,
  };

  let response: Response;
  try {
    response = await request({ ...base, response_format: { type: "json_object" } });
  } catch (error) {
    // Only retry when the provider rejected the JSON *mode*. A rate limit or an
    // auth failure would just burn a second request and hit the same wall.
    if (error instanceof AiError && (error.status === 429 || error.status === 401)) throw error;
    response = await request(base);
  }

  const payload = (await response.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    if (payload.choices?.[0]?.finish_reason === "length") {
      throw new AiError(
        "The model ran out of output space before finishing — it spends part of its budget reasoning. Try a shorter brief, or use a larger model via AI_MODEL.",
        502,
      );
    }
    throw new AiError("The model did not return JSON. Try again.", 502);
  }

  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("The model returned malformed JSON.", 502);
  }
}
