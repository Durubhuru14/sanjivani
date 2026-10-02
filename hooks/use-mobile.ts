import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** Reactive viewport-width hook (useSyncExternalStore — no setState-in-effect). */
export function useIsMobile() {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
      mql.addEventListener("change", onStoreChange)
      return () => mql.removeEventListener("change", onStoreChange)
    },
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
}
