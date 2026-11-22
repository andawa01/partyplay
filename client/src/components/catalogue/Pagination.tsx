import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui/button";

const WINDOW_SIZE = 5;

export function Pagination({
  page,
  totalPages,
  onChange,
  label = "Catalogue pages",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const start = Math.max(1, Math.min(page - Math.floor(WINDOW_SIZE / 2), totalPages - WINDOW_SIZE + 1));
  const end = Math.min(totalPages, start + WINDOW_SIZE - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav aria-label={label} className="mt-10 flex items-center justify-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {start > 1 ? (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(1)}>
            1
          </Button>
          {start > 2 ? <span className="px-1 text-sm text-slate-400">…</span> : null}
        </>
      ) : null}

      {pages.map((number) => (
        <Button
          key={number}
          type="button"
          variant={number === page ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(number)}
          aria-current={number === page ? "page" : undefined}
          aria-label={`Page ${number}`}
          className="min-w-8"
        >
          {number}
        </Button>
      ))}

      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="px-1 text-sm text-slate-400">…</span> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </nav>
  );
}
