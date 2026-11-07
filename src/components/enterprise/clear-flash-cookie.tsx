"use client";

import { useEffect } from "react";

/** The token is shown once; drop the cookie as soon as it has been rendered. */
export function ClearFlashCookie({ name }: { name: string }) {
  useEffect(() => {
    document.cookie = `${name}=; Max-Age=0; path=/enterprise`;
  }, [name]);
  return null;
}
