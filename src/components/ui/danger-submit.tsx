"use client";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

export function DangerSubmit({
  message,
  children,
  ...props
}: ButtonProps & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
