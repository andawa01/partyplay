import * as React from "react";

import { cn } from "../../lib/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-slate-200", className)}
      aria-hidden="true"
      {...props}
    >
      <span className="skeleton-shimmer absolute inset-0" />
    </div>
  );
}

export { Skeleton };
