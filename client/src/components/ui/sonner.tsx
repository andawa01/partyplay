import type { ComponentProps } from "react";
import { Toaster as SonnerToaster } from "sonner";

/**
 * The app's only toast surface. Mounted once in AppProviders; features call `toast`
 * from `lib/toast` rather than rendering their own notification UI.
 */
export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:border-slate-200 group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-600",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-brand-700 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700",
          error: "group-[.toaster]:border-red-200",
          success: "group-[.toaster]:border-emerald-200",
          warning: "group-[.toaster]:border-amber-200",
          info: "group-[.toaster]:border-brand-200",
        },
      }}
      {...props}
    />
  );
}
