import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import BrowserSupportBanner from "@/components/Common/BrowserSupportBanner"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"
import { isLoggedIn } from "@/hooks/useAuth"

function RootRouteComponent() {
  // Skip link targets (#retirement-ticker, #main-content, #primary-navigation)
  // only exist in the authed _layout shell. Rendering them on public routes
  // triggers Lighthouse "skip-link" audit failure ("No skip link target").
  const showSkipLinks = isLoggedIn()

  return (
    <>
      {showSkipLinks && (
        <>
          <a href="#retirement-ticker" className="skip-link">
            Skip to ticker
          </a>
          <a href="#main-content" className="skip-link left-32">
            Skip to main content
          </a>
          <a href="#primary-navigation" className="skip-link left-72">
            Skip to navigation
          </a>
        </>
      )}
      <div id="app-live-polite" aria-live="polite" className="sr-only" />
      <div
        id="app-live-assertive"
        aria-live="assertive"
        role="alert"
        className="sr-only"
      />
      <BrowserSupportBanner />
      <HeadContent />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

export const Route = createRootRoute({
  component: RootRouteComponent,
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
