import { Loader2, ShieldCheck } from "lucide-react";

export function AdminSessionLoading({ label = "Checking your session…" }: { label?: string }) {
  return (
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4"
      aria-busy="true"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-brand-700/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-blush-700/20 blur-3xl"
      />
      <div className="relative text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-brand-700 shadow-lg">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-4 text-lg font-semibold text-white">PartyPlay Admin</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {label}
        </p>
      </div>
    </div>
  );
}
