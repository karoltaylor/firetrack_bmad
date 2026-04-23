import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import EmptyStateDashboard from "@/components/EmptyStateDashboard"

export const Route = createFileRoute("/_layout/dashboard")({
  validateSearch: z
    .object({
      mode: z.enum(["preview", "simulator"]).optional(),
    })
    .strict(),
  component: DashboardRoute,
  head: () => ({
    meta: [
      {
        title: "Dashboard - FastAPI Cloud",
      },
    ],
  }),
})

function DashboardRoute() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const mode = search.mode ?? "preview"

  const handleModeChange = (nextMode: "preview" | "simulator") => {
    navigate({
      search: () => ({ mode: nextMode }),
      replace: true,
    })
  }

  return <EmptyStateDashboard mode={mode} onModeChange={handleModeChange} />
}

export default DashboardRoute
