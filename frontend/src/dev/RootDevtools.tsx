import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

/**
 * Devtool panels: loaded only from __root__ via dynamic import in development.
 * Keeps @tanstack/*-devtools out of the production initial bundle and improves Lighthouse performance.
 */
export function RootDevtools() {
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
