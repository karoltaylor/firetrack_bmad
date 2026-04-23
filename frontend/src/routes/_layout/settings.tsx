import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/settings")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/settings") {
      throw redirect({ to: "/settings/account" })
    }
  },
  component: SettingsLayout,
  head: () => ({
    meta: [
      {
        title: "Settings - FastAPI Cloud",
      },
    ],
  }),
})

function SettingsLayout() {
  return <Outlet />
}
