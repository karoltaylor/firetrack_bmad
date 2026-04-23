import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"

import {
  FIRENumberCalculator,
  type FIRENumberCalculatorState,
} from "@/components/FIRENumberCalculator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useAuth from "@/hooks/useAuth"
import {
  convertAnnualExpensesToEur,
  FALLBACK_ECB_RATES,
  fetchLatestEcbRates,
  getFireVariantFromAnnualExpenses,
} from "@/lib/fireVariant"
import {
  getUserProfile,
  isOnboardingComplete,
  type UserProfileRecord,
} from "@/lib/userProfile"

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
  const [ecbRates, setEcbRates] = useState(FALLBACK_ECB_RATES)
  const [isVariantPopoverOpen, setVariantPopoverOpen] = useState(false)
  const [calculatorState, setCalculatorState] =
    useState<FIRENumberCalculatorState | null>(null)

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

  useEffect(() => {
    const loadRates = async () => {
      const latestRates = await fetchLatestEcbRates()
      setEcbRates(latestRates)
    }
    void loadRates()
  }, [])

  const handleCalculatorStateChange = useCallback(
    (nextState: FIRENumberCalculatorState) => {
      setCalculatorState(nextState)
    },
    [],
  )

  if (isCheckingProfile) {
    return <p className="text-muted-foreground">Loading dashboard...</p>
  }

  const annualExpenses = profile?.annualExpenses ?? null
  const baseCurrency = profile?.baseCurrency ?? "EUR"
  const swrPercent = profile?.swrPercent ?? 4
  const calculatorAnnualExpenses =
    calculatorState?.annualExpenses ?? annualExpenses
  const calculatorFireNumber = calculatorState?.fireNumber ?? null
  const calculatorCurrentAge =
    calculatorState?.currentAge ?? profile?.currentAge ?? null
  const calculatorTargetAge =
    calculatorState?.targetRetirementAge ?? profile?.targetRetirementAge ?? null
  const yearsToTarget =
    calculatorCurrentAge !== null &&
    calculatorTargetAge !== null &&
    calculatorTargetAge > calculatorCurrentAge
      ? calculatorTargetAge - calculatorCurrentAge
      : null
  const variantConversion =
    calculatorAnnualExpenses && calculatorAnnualExpenses > 0
      ? convertAnnualExpensesToEur(
          calculatorAnnualExpenses,
          baseCurrency,
          ecbRates,
        )
      : null
  const fireVariant = variantConversion
    ? getFireVariantFromAnnualExpenses(variantConversion.annualExpensesEur)
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
        <FIRENumberCalculator
          initialCurrentAge={profile?.currentAge ?? null}
          initialTargetRetirementAge={profile?.targetRetirementAge ?? null}
          initialAnnualExpenses={annualExpenses}
          baseCurrency={baseCurrency}
          swrPercent={swrPercent}
          onStateChange={handleCalculatorStateChange}
          metricTrailing={
            fireVariant ? (
              <Popover
                open={isVariantPopoverOpen}
                onOpenChange={setVariantPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1 font-medium text-sm"
                    onMouseEnter={() => setVariantPopoverOpen(true)}
                    onMouseLeave={() => setVariantPopoverOpen(false)}
                    onFocus={() => setVariantPopoverOpen(true)}
                    onBlur={() => setVariantPopoverOpen(false)}
                  >
                    {fireVariant}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="space-y-3 text-sm"
                  onMouseEnter={() => setVariantPopoverOpen(true)}
                  onMouseLeave={() => setVariantPopoverOpen(false)}
                >
                  <p className="font-semibold">FIRE variant thresholds</p>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1">Variant</th>
                        <th className="py-1">Annual expenses (EUR)</th>
                        <th className="py-1">Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-1">Lean</td>
                        <td className="py-1">&lt; €40,000</td>
                        <td className="py-1">
                          Minimalist spending target with tighter lifestyle
                          bounds.
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-1">Standard</td>
                        <td className="py-1">€40,000 - €100,000</td>
                        <td className="py-1">
                          Balanced target covering mainstream retirement
                          expectations.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">Fat</td>
                        <td className="py-1">&gt; €100,000</td>
                        <td className="py-1">
                          Higher-spend target designed for premium flexibility.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </PopoverContent>
              </Popover>
            ) : null
          }
        />
        <p className="text-muted-foreground text-sm">SWR: {swrPercent}%</p>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          Methodology: ECB rate as of {variantConversion?.rateAsOf}
        </span>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="font-medium text-sm">Retirement trajectory preview</p>
          <p className="text-muted-foreground text-sm">
            Add your first transaction to see your real trajectory.
          </p>
          {calculatorFireNumber !== null && yearsToTarget !== null ? (
            <p className="text-muted-foreground text-sm">
              Preview mode: this plan targets financial independence in about{" "}
              {yearsToTarget} years based on the current calculator inputs.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href="/items"
            className="rounded-md border px-3 py-2 font-medium hover:bg-muted"
          >
            Add transaction manually
          </a>
          <a
            href="/items?entry=import-statement"
            className="rounded-md border px-3 py-2 font-medium hover:bg-muted"
          >
            Import statement
          </a>
        </div>
        <p className="text-muted-foreground">
          Start small: update assumptions, explore the calculator, and add your
          first data source when you are ready.
        </p>
      </div>
    </section>
  )
}
