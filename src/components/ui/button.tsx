import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-blue-500/40 bg-brand-strong text-white shadow-[0_10px_28px_-16px_rgba(37,99,235,0.9)] hover:border-blue-400/60 hover:bg-blue-600",
        secondary: "border-line bg-raised text-ink hover:border-[#31456b] hover:bg-[#162441]",
        outline: "border-line bg-transparent text-ink hover:bg-white/[0.04]",
        ghost: "border-transparent bg-transparent text-muted hover:bg-white/[0.05] hover:text-ink",
        danger: "border-danger/30 bg-danger/10 text-red-200 hover:bg-danger/20",
        brand: "border-sky-300/30 bg-brand text-[#04121f] hover:bg-sky-300",
      },
      size: {
        sm: "h-8 px-3 text-[12px]",
        md: "h-9 px-3.5 text-[12.5px]",
        lg: "h-11 px-5 text-[13.5px]",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
