"use client";

import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Form wrapper for server actions.
 *
 * A server action that calls `revalidatePath` already sends the re-rendered
 * route back with its response, so the page updates on its own. Calling
 * `router.refresh()` on top of that made every button click render the page
 * twice — the visible stall on a small hosted instance. Pass `refresh` only for
 * an action that revalidates some other route and leaves this one stale.
 */
export function ActionForm({
  action,
  children,
  refresh = false,
  ...props
}: Omit<ComponentProps<"form">, "action" | "children"> & {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  refresh?: boolean;
}) {
  const router = useRouter();

  return (
    <form
      {...props}
      action={async (formData) => {
        await action(formData);
        if (refresh) router.refresh();
      }}
    >
      {children}
    </form>
  );
}
