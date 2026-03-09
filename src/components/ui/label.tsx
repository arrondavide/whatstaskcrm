"use client";

import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-40",
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-destructive">*</span>}
  </label>
));

Label.displayName = "Label";

export { Label };
