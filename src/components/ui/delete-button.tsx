"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        await action(formData);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={label} className="text-faint transition-colors hover:text-red-300">
        <Trash2 className="size-3" />
      </button>
    </form>
  );
}
