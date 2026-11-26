import { Package } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../lib/cn";

/** Package photos are owner-hosted URLs, so a missing or broken one needs a real fallback. */
export function PackageImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-linear-to-br from-blush-100 via-white to-brand-100",
        className,
      )}
    >
      {src && !failed ? (
        <>
          {!loaded ? (
            <span aria-hidden="true" className="skeleton-shimmer absolute inset-0" />
          ) : null}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "size-full object-cover transition duration-500 group-hover:scale-105",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <div className="grid size-full place-items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/70 text-blush-700 ring-1 ring-white">
            <Package aria-hidden="true" className="size-7" />
          </span>
          <span className="sr-only">No photo available for {alt}</span>
        </div>
      )}
    </div>
  );
}
