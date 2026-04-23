import { createFileRoute } from "@tanstack/react-router"
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUserProfile, upsertUserProfile } from "@/lib/userProfile"

type GoalField = "targetRetirementAge" | "annualExpenses" | "swrPercent"
type HistoryState = Record<GoalField, number[]>

export const Route = createFileRoute("/_layout/settings/fire-goal")({
  component: FireGoalSettings,
  head: () => ({
    meta: [{ title: "FIRE Goal Settings - FIREtrack" }],
  }),
})

function FireGoalSettings() {
  const navigate = Route.useNavigate()
  const historyRef = useRef<HistoryState>({
    targetRetirementAge: [],
    annualExpenses: [],
    swrPercent: [],
  })

  const [isReady, setIsReady] = useState(false)
  const [currentAge, setCurrentAge] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<GoalField, string | undefined>>({
    targetRetirementAge: undefined,
    annualExpenses: undefined,
    swrPercent: undefined,
  })
  const [values, setValues] = useState<Record<GoalField, string>>({
    targetRetirementAge: "",
    annualExpenses: "",
    swrPercent: "",
  })
  const [savedValues, setSavedValues] = useState<Record<GoalField, number>>({
    targetRetirementAge: 0,
    annualExpenses: 0,
    swrPercent: 4,
  })

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getUserProfile()
      if (!profile) {
        navigate({ to: "/onboarding" })
        return
      }

      setCurrentAge(profile.currentAge)
      setValues({
        targetRetirementAge: String(profile.targetRetirementAge ?? ""),
        annualExpenses: String(profile.annualExpenses ?? ""),
        swrPercent: String(profile.swrPercent),
      })
      setSavedValues({
        targetRetirementAge: profile.targetRetirementAge ?? 0,
        annualExpenses: profile.annualExpenses ?? 0,
        swrPercent: profile.swrPercent,
      })
      setIsReady(true)
    }

    void loadProfile()
  }, [navigate])

  const parsedValues = useMemo(
    () => ({
      targetRetirementAge: Number(values.targetRetirementAge),
      annualExpenses: Number(values.annualExpenses),
      swrPercent: Number(values.swrPercent),
    }),
    [values],
  )

  const validateField = (field: GoalField): string | undefined => {
    if (field === "targetRetirementAge") {
      const nextValue = parsedValues.targetRetirementAge
      if (!Number.isInteger(nextValue)) {
        return "Enter a whole retirement age value."
      }
      if (currentAge !== null && nextValue <= currentAge) {
        return "Choose a retirement age greater than your current age."
      }
      return undefined
    }

    if (field === "annualExpenses") {
      const nextValue = parsedValues.annualExpenses
      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        return "Enter annual expenses greater than zero."
      }
      return undefined
    }

    const nextValue = parsedValues.swrPercent
    if (!Number.isFinite(nextValue) || nextValue < 1 || nextValue > 10) {
      return "Set SWR between 1 and 10 percent."
    }
    return undefined
  }

  const saveField = async (field: GoalField) => {
    const error = validateField(field)
    setErrors((prev) => ({ ...prev, [field]: error }))
    if (error) {
      return
    }

    const nextValue = parsedValues[field]
    if (!Number.isFinite(nextValue)) {
      return
    }

    const previousValue = savedValues[field]
    if (nextValue !== previousValue) {
      historyRef.current[field].push(previousValue)
      setSavedValues((prev) => ({ ...prev, [field]: nextValue }))
      await upsertUserProfile({ [field]: nextValue })
    }
  }

  const handleUndo = async (field: GoalField) => {
    const history = historyRef.current[field]
    if (history.length === 0) {
      return
    }
    const previousValue = history.pop()
    if (previousValue === undefined) {
      return
    }
    setValues((prev) => ({ ...prev, [field]: String(previousValue) }))
    setSavedValues((prev) => ({ ...prev, [field]: previousValue }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    await upsertUserProfile({ [field]: previousValue })
  }

  const bindField = (field: GoalField) => ({
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
    },
    onBlur: () => {
      void saveField(field)
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        void handleUndo(field)
      }
    },
  })

  if (!isReady) {
    return (
      <p className="text-muted-foreground">Loading FIRE goal settings...</p>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-h1 font-semibold">FIRE Goal Settings</h1>
        <p className="text-muted-foreground">
          Changes autosave on blur and update your dashboard metrics instantly.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="retirement-age">Target retirement age</Label>
          <Input
            id="retirement-age"
            inputMode="numeric"
            placeholder="e.g. 55"
            {...bindField("targetRetirementAge")}
          />
          {errors.targetRetirementAge ? (
            <p className="text-[13px] text-[var(--off-target)]">
              {errors.targetRetirementAge}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="annual-expenses">Annual expenses</Label>
          <Input
            id="annual-expenses"
            inputMode="decimal"
            placeholder="e.g. 42000"
            {...bindField("annualExpenses")}
          />
          {errors.annualExpenses ? (
            <p className="text-[13px] text-[var(--off-target)]">
              {errors.annualExpenses}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="swr-percent">SWR (%)</Label>
          <Input
            id="swr-percent"
            inputMode="decimal"
            placeholder="1-10"
            {...bindField("swrPercent")}
          />
          {errors.swrPercent ? (
            <p className="text-[13px] text-[var(--off-target)]">
              {errors.swrPercent}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default FireGoalSettings
