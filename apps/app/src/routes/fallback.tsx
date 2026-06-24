// Route-level HydrateFallback shown while a lazy route chunk is loading.
//
// We intentionally keep this surface VERY quiet — large pulsing skeleton
// blocks read as flashing blue panels (Skeleton uses the accent
// `state-base-hover-alt` token), which fights the rest of the workbench
// design. Per DESIGN.md "calm, hairline-first": no animation, no tinted
// panels — just an empty page-shaped slot that gets replaced once the route
// chunk renders. The page header is owned by `AppShell` so we don't render a
// title placeholder here either.

export function EntryRouteHydrateFallback() {
  return (
    <div role="status" className="h-[240px] w-full max-w-[400px]">
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function RouteHydrateFallback() {
  return (
    <div role="status" className="flex flex-col gap-6 p-4 md:p-6" data-route-fallback>
      <span className="sr-only">Loading</span>
    </div>
  )
}
