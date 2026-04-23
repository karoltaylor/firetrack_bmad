import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import useAuth from "@/hooks/useAuth"
import { getUserProfile, isOnboardingComplete } from "@/lib/userProfile"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - FastAPI Cloud",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const navigate = Route.useNavigate()
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  useEffect(() => {
    const resolveOnboardingState = async () => {
      const profile = await getUserProfile()
      if (!isOnboardingComplete(profile)) {
        navigate({ to: "/onboarding" })
        return
      }
      setIsCheckingProfile(false)
    }
    void resolveOnboardingState()
  }, [navigate])

  if (isCheckingProfile) {
    return <p className="text-muted-foreground">Loading dashboard...</p>
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-h1 font-semibold break-words">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground">
          Your onboarding is complete. FIREtrack is ready for your first data
          import.
        </p>
      </header>
      <div className="space-y-3 rounded-xl border p-6">
        <h2 className="text-h2 font-semibold">Empty-state dashboard</h2>
        <p className="text-muted-foreground">
          No transactions are connected yet. Add accounts or import activity to
          unlock projections and progress tracking.
        </p>
      </div>
    </section>
  )
}
