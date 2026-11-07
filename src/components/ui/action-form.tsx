"use client";

import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Server actions that mutate and return (without redirecting) can leave the
 * client router showing the payload it rendered before the write. Refreshing
 * after the action completes makes the new record visible immediately.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "children"> & {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <form
      {...props}
      action={async (formData) => {
        await action(formData);
        router.refresh();
      }}
    >
      {children}
    </form>
  );
}
