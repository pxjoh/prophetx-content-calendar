import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}
