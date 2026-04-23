import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import useAuth from "@/hooks/useAuth"
import { calculateFireNumberFromAnnualExpenses } from "@/lib/fireNumber"
import {
  getUserProfile,
  isOnboardingComplete,
  type UserProfileRecord,
} from "@/lib/userProfile"
import { formatMetric } from "@/shared/lib/formatMetric"

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
  const [profile, setProfile] = useState<UserProfileRecord | null>(null)

  useEffect(() => {
    const resolveOnboardingState = async () => {
      const nextProfile = await getUserProfile()
      if (!isOnboardingComplete(nextProfile)) {
        navigate({ to: "/onboarding" })
        return
      }
      setProfile(nextProfile)
      setIsCheckingProfile(false)
    }

    const onProfileUpdated = () => {
      void resolveOnboardingState()
    }

    window.addEventListener("user-profile-updated", onProfileUpdated)
    void resolveOnboardingState()
    return () => {
      window.removeEventListener("user-profile-updated", onProfileUpdated)
    }
  }, [navigate])

  if (isCheckingProfile) {
    return <p className="text-muted-foreground">Loading dashboard...</p>
  }

  const annualExpenses = profile?.annualExpenses ?? null
  const fireNumber =
    annualExpenses && annualExpenses > 0
      ? calculateFireNumberFromAnnualExpenses(annualExpenses)
      : null

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
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">FIRE number</p>
          <p className="font-mono text-3xl tabular-nums">
            {fireNumber === null
              ? "—"
              : formatMetric(fireNumber, { currency: "EUR" })}
          </p>
          <p className="text-muted-foreground text-sm">
            Based on annual expenses:{" "}
            {annualExpenses === null
              ? "—"
              : formatMetric(annualExpenses, { currency: "EUR" })}
          </p>
        </div>
        <p className="text-muted-foreground">
          No transactions are connected yet. Add accounts or import activity to
          unlock projections and progress tracking.
        </p>
      </div>
    </section>
  )
}
