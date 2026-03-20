import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#ffc9a0] via-[#f08838] to-[#e86818] text-[#2c1408] shadow-app-raised hover:brightness-[1.04] hover:shadow-app-raised-hover active:scale-[0.98] dark:from-[#f5e2c4] dark:via-[#e9a85a] dark:to-[#a86a28] dark:text-[#1a0c06] dark:hover:brightness-110",
        ghost:
          "text-app-fg-secondary hover:bg-app-surface-2 hover:text-app-fg dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white",
        outline:
          "border border-app-border bg-transparent text-app-fg hover:bg-app-surface-2 hover:border-app-border-strong active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
