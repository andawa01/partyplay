import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../lib/cn";

/**
 * Catalogue images are owner-hosted URLs with no upload path, so a broken or empty URL has
 * to look deliberate. The fallback is the same gradient on every card.
 */
export function EquipmentImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-linear-to-br from-brand-100 via-white to-blush-100",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="grid size-full place-items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/70 text-brand-700 ring-1 ring-white">
            <PartyPopper aria-hidden="true" className="size-7" />
          </span>
          <span className="sr-only">No photo available for {alt}</span>
        </div>
      )}
    </div>
  );
}
