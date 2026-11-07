"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageSquareText, ShieldCheck, Sparkles, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What are my top three audit gaps right now?",
  "What evidence will an ISO 27001 Stage 1 auditor ask for?",
  "Which policies should we approve first, and why?",
];

/**
 * Floating Virtual CISO. Answers are grounded in the live workspace by the
 * server route, so the panel only owns conversation state and streaming.
 */
export function Assistant({ configured, workspaceName }: { configured: boolean; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending || !configured) return;

    setError(null);
    setInput("");
    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setSending(true);

    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "The assistant could not answer that.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }

      if (!answer.trim()) {
        setMessages([...history, { role: "assistant", content: "_No answer came back. Try rephrasing._" }]);
      }
    } catch (cause) {
      setMessages(history);
      setError(cause instanceof Error ? cause.message : "The assistant is unavailable.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close Virtual CISO" : "Open Virtual CISO"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-[12px] font-medium shadow-[0_18px_40px_-18px_rgba(2,8,23,0.9)] transition-colors",
          open
            ? "border-line bg-[#0d1830] text-ink"
            : "border-sky-300/25 bg-brand text-[#04121f] hover:bg-sky-300",
        )}
      >
        {open ? <X className="size-4" /> : <Sparkles className="size-4" />}
        <span className="hidden sm:inline">vCISO</span>
      </button>

      {open ? (
        <section
          aria-label="Virtual CISO assistant"
          className="fixed bottom-20 right-4 z-40 flex h-[min(560px,calc(100vh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-[#0a1324] shadow-[0_40px_80px_-30px_rgba(2,8,23,0.95)]"
        >
          <header className="flex items-start gap-2.5 border-b border-line px-4 py-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-sky-300/25 bg-brand/10">
              <Sparkles className="size-4 text-sky-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink">Virtual CISO</p>
              <p className="truncate text-[10px] uppercase tracking-[0.1em] text-faint">
                Grounded in {workspaceName}
              </p>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!configured ? (
              <div className="rounded-xl border border-warning/25 bg-warning/[0.06] p-3 text-[11.5px] leading-relaxed text-amber-100">
                <p className="font-medium text-amber-200">AI is not configured</p>
                <p className="mt-1 text-amber-100/80">
                  Add <code className="rounded bg-black/30 px-1 font-mono text-[10.5px]">AI_API_KEY</code>,{" "}
                  <code className="rounded bg-black/30 px-1 font-mono text-[10.5px]">AI_BASE_URL</code> and{" "}
                  <code className="rounded bg-black/30 px-1 font-mono text-[10.5px]">AI_MODEL</code> to the environment to
                  enable the assistant. Any OpenAI-compatible provider works.
                </p>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex gap-2 rounded-xl border border-line bg-panel/70 px-3 py-2.5">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-mint" />
                  <p className="text-[11.5px] leading-relaxed text-muted">
                    Hi — I&apos;m your virtual CISO. I can see this workspace&apos;s policies, risks, controls and evidence.
                    Ask me what to fix next, or how an auditor will read it.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={!configured}
                      onClick={() => send(suggestion)}
                      className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel/50 px-2.5 py-2 text-left text-[11px] text-muted transition-colors hover:border-[#31456b] hover:text-ink disabled:opacity-50"
                    >
                      <MessageSquareText className="size-3 shrink-0 text-faint" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "user" ? (
                  <p className="max-w-[85%] rounded-xl rounded-br-sm border border-sky-300/20 bg-brand/15 px-3 py-2 text-[11.5px] leading-relaxed text-ink">
                    {message.content}
                  </p>
                ) : (
                  <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-line bg-panel/80 px-3 py-2">
                    {message.content ? (
                      <div className="text-[11.5px] leading-relaxed text-muted">
                        <Markdown content={message.content} />
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] text-faint">
                        <Loader2 className="size-3 animate-spin" /> Thinking through your registers…
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-red-200">{error}</p>
            ) : null}
          </div>

          <form
            className="border-t border-line p-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-line bg-[#0d1830] px-2.5 py-1.5 focus-within:border-[#31456b]">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                disabled={!configured || sending}
                placeholder={configured ? "Ask about gaps, audits, policies…" : "Add an AI key to enable the assistant"}
                aria-label="Ask the Virtual CISO"
                className="max-h-28 min-h-[28px] w-full resize-none bg-transparent py-1 text-[11.5px] text-ink placeholder:text-faint focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!configured || sending || !input.trim()}
                aria-label="Send"
                className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-sky-300/25 bg-brand text-[#04121f] transition-colors hover:bg-sky-300 disabled:opacity-40"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[9.5px] text-faint">
              AI drafts are advisory — a human approves before anything becomes authoritative.
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}
