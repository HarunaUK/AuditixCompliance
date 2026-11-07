"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("workspace_render_failed", error);
  }, [error]);

  const looksLikeDatabase = /connect|database|prisma|ECONNREFUSED|timeout/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-xl border border-warning/25 bg-warning/10 text-amber-300">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-3 text-[16px] font-semibold text-ink">
          {looksLikeDatabase ? "The workspace database is not responding" : "This page could not be loaded"}
        </h1>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          {looksLikeDatabase
            ? "Your session is still valid. Retry once the database is back — the supervisor normally restarts it within a few seconds."
            : "The server hit an unexpected error while rendering this page. Retrying is safe; nothing was written."}
        </p>
        <Button variant="primary" size="sm" className="mt-4" onClick={reset}>
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      </div>
    </div>
  );
}
