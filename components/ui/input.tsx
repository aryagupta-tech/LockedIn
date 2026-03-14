import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#222] bg-[#111] px-4 py-2 text-[15px] text-white placeholder:text-[#555] transition-all duration-200 focus-visible:outline-none focus-visible:border-[#333] focus-visible:ring-1 focus-visible:ring-[#333] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
