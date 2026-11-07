import { cn } from "@/lib/utils";

export function Logo({
  variant = "horizontal",
  className,
  alt = "Auditix — IT audit and compliance",
}: {
  variant?: "horizontal" | "mark" | "mark-light";
  className?: string;
  alt?: string;
}) {
  if (variant === "mark" || variant === "mark-light") {
    return (
      <img
        src={variant === "mark" ? "/brand/auditix-mark.png" : "/brand/auditix-mark-white.png"}
        alt={alt}
        width={256}
        height={256}
        className={cn("size-9 rounded-[10px] object-contain", className)}
      />
    );
  }
  return (
    <img
      src="/brand/auditix-logo.png"
      alt={alt}
      width={640}
      height={200}
      className={cn("h-11 w-auto rounded-lg", className)}
    />
  );
}
