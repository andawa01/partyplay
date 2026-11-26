import { useLocation } from "react-router-dom";

/**
 * A thin brand bar that sweeps once per navigation. Rendering it keyed by pathname keeps
 * it dependency-free: a new route restarts the CSS animation, and an idle app draws nothing.
 */
export function RouteProgress() {
  const { pathname } = useLocation();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        key={pathname}
        className="route-progress h-full bg-gradient-to-r from-brand-500 via-brand-400 to-blush-400"
      />
    </div>
  );
}
