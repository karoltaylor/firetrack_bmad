import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  COUNTRY_OPTIONS,
  clearUserProfile,
  getCpiSourceForCountry,
  getUserProfile,
  isOnboardingComplete,
  THIRTY_DAYS_MS,
  upsertUserProfile,
} from "@/lib/userProfile"

const TOTAL_STEPS = 4
const COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map((country) => country.code))

type WizardValues = {
  currentAge: string
  targetRetirementAge: string
  annualExpenses: string
  countryCode: string
}

type WizardErrors = {
  currentAge?: string
  targetRetirementAge?: string
  annualExpenses?: string
  countryCode?: string
}

const clampStep = (value: number): number => {
  if (Number.isNaN(value) || value < 1) return 1
  if (value > TOTAL_STEPS) return TOTAL_STEPS
  return value
}

const getStepFromUrl = (): number => {
  const params = new URLSearchParams(window.location.search)
  return clampStep(Number(params.get("step") ?? "1"))
}

const parseInteger = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const parsePositiveNumber = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const Route = createFileRoute("/_layout/onboarding")({
  component: OnboardingWizard,
  head: () => ({
    meta: [
      {
        title: "Onboarding - FIREtrack",
      },
    ],
  }),
})

function OnboardingWizard() {
  const navigate = useNavigate()
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const [isReady, setIsReady] = useState(false)
  const [step, setStep] = useState<number>(() => getStepFromUrl())
  const [errors, setErrors] = useState<WizardErrors>({})
  const [values, setValues] = useState<WizardValues>({
    currentAge: "",
    targetRetirementAge: "",
    annualExpenses: "",
    countryCode: "",
  })

  const stepLabel = useMemo(() => {
    switch (step) {
      case 1:
        return "Current Age"
      case 2:
        return "Target Retirement Age"
      case 3:
        return "Annual Expenses"
      default:
        return "Country of Residence"
    }
  }, [step])

  const setUrlStep = useCallback((nextStep: number, replace = false) => {
    const safeStep = clampStep(nextStep)
    const url = new URL(window.location.href)
    url.searchParams.set("step", String(safeStep))
    if (replace) {
      window.history.replaceState({}, "", url)
    } else {
      window.history.pushState({}, "", url)
    }
    setStep(safeStep)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setStep(getStepFromUrl())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      const profile = await getUserProfile()
      if (isOnboardingComplete(profile)) {
        navigate({ to: "/" })
        return
      }

      if (profile) {
        const updatedAtTs = Date.parse(profile.updatedAt)
        const isExpired =
          Number.isFinite(updatedAtTs) &&
          Date.now() - updatedAtTs > THIRTY_DAYS_MS

        if (isExpired) {
          await clearUserProfile()
        } else {
          setValues({
            currentAge: profile.currentAge?.toString() ?? "",
            targetRetirementAge: profile.targetRetirementAge?.toString() ?? "",
            annualExpenses: profile.annualExpenses?.toString() ?? "",
            countryCode: profile.countryCode ?? "",
          })
          setUrlStep(profile.lastStep || 1, true)
        }
      }

      setIsReady(true)
    }
    void bootstrap()
  }, [navigate, setUrlStep])

  const validateCurrentAge = (): number | null => {
    const currentAge = parseInteger(values.currentAge)
    if (currentAge === null || currentAge < 18 || currentAge > 99) {
      setErrors((prev) => ({
        ...prev,
        currentAge: "Enter an age between 18 and 99.",
      }))
      return null
    }
    setErrors((prev) => ({ ...prev, currentAge: undefined }))
    return currentAge
  }

  const validateTargetRetirementAge = (): number | null => {
    const currentAge = parseInteger(values.currentAge)
    const retirementAge = parseInteger(values.targetRetirementAge)
    if (retirementAge === null || retirementAge < 19 || retirementAge > 99) {
      setErrors((prev) => ({
        ...prev,
        targetRetirementAge: "Enter a retirement age between 19 and 99.",
      }))
      return null
    }
    if (currentAge !== null && retirementAge <= currentAge) {
      setErrors((prev) => ({
        ...prev,
        targetRetirementAge:
          "Choose a retirement age greater than your current age.",
      }))
      return null
    }
    setErrors((prev) => ({ ...prev, targetRetirementAge: undefined }))
    return retirementAge
  }

  const validateAnnualExpenses = (): number | null => {
    const annualExpenses = parsePositiveNumber(values.annualExpenses)
    if (annualExpenses === null || annualExpenses <= 0) {
      setErrors((prev) => ({
        ...prev,
        annualExpenses: "Enter annual expenses greater than zero.",
      }))
      return null
    }
    setErrors((prev) => ({ ...prev, annualExpenses: undefined }))
    return annualExpenses
  }

  const validateCountryCode = (): string | null => {
    if (!values.countryCode || !COUNTRY_CODES.has(values.countryCode)) {
      setErrors((prev) => ({
        ...prev,
        countryCode: "Select a supported country of residence.",
      }))
      return null
    }
    setErrors((prev) => ({ ...prev, countryCode: undefined }))
    return values.countryCode
  }

  const queueProfileSave = (patch: Parameters<typeof upsertUserProfile>[0]) => {
    const write = () => upsertUserProfile(patch)
    saveQueueRef.current = saveQueueRef.current.then(write, write)
    return saveQueueRef.current
  }

  const persistProgress = async (lastStep: number) => {
    const currentAge = parseInteger(values.currentAge)
    const targetRetirementAge = parseInteger(values.targetRetirementAge)
    const annualExpenses = parsePositiveNumber(values.annualExpenses)
    const countryCode = values.countryCode || null
    const patch: Parameters<typeof upsertUserProfile>[0] = { lastStep }
    if (currentAge !== null) {
      patch.currentAge = currentAge
    }
    if (targetRetirementAge !== null) {
      patch.targetRetirementAge = targetRetirementAge
    }
    if (annualExpenses !== null) {
      patch.annualExpenses = annualExpenses
    }
    if (countryCode) {
      patch.countryCode = countryCode
      patch.cpi_source = getCpiSourceForCountry(countryCode)
    }
    await queueProfileSave(patch)
  }

  const handleBlur = async () => {
    switch (step) {
      case 1:
        if (validateCurrentAge() !== null) {
          await persistProgress(step)
        }
        break
      case 2:
        if (validateTargetRetirementAge() !== null) {
          await persistProgress(step)
        }
        break
      case 3:
        if (validateAnnualExpenses() !== null) {
          await persistProgress(step)
        }
        break
      default:
        if (validateCountryCode() !== null) {
          await persistProgress(step)
        }
    }
  }

  const handleNext = async () => {
    const isValid =
      (step === 1 && validateCurrentAge() !== null) ||
      (step === 2 && validateTargetRetirementAge() !== null) ||
      (step === 3 && validateAnnualExpenses() !== null) ||
      (step === 4 && validateCountryCode() !== null)

    if (!isValid) {
      return
    }

    if (step < TOTAL_STEPS) {
      const nextStep = step + 1
      await persistProgress(nextStep)
      setUrlStep(nextStep)
    }
  }

  const handleBack = async () => {
    if (step <= 1) return
    const previousStep = step - 1
    await persistProgress(previousStep)
    setUrlStep(previousStep)
  }

  const handleSubmit = async () => {
    const currentAge = validateCurrentAge()
    const targetRetirementAge = validateTargetRetirementAge()
    const annualExpenses = validateAnnualExpenses()
    const countryCode = validateCountryCode()

    if (
      currentAge === null ||
      targetRetirementAge === null ||
      annualExpenses === null ||
      countryCode === null
    ) {
      return
    }

    await queueProfileSave({
      currentAge,
      targetRetirementAge,
      annualExpenses,
      countryCode,
      cpi_source: getCpiSourceForCountry(countryCode),
      lastStep: TOTAL_STEPS,
      completedAt: new Date().toISOString(),
    })
    navigate({ to: "/" })
  }

  if (!isReady) {
    return <p className="text-muted-foreground">Loading onboarding...</p>
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-h1 font-semibold">Welcome to FIREtrack</h1>
        <p className="text-muted-foreground">
          Step {step} of {TOTAL_STEPS}: {stepLabel}
        </p>
      </header>

      <div className="space-y-4 rounded-xl border p-6">
        {step === 1 ? (
          <div className="space-y-2">
            <Label htmlFor="current-age">Current age</Label>
            <Input
              id="current-age"
              inputMode="numeric"
              value={values.currentAge}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  currentAge: event.target.value,
                }))
              }
              onBlur={() => void handleBlur()}
              placeholder="18-99"
            />
            {errors.currentAge ? (
              <p className="text-[13px] font-normal text-[var(--off-target)]">
                {errors.currentAge}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <Label htmlFor="target-age">Target retirement age</Label>
            <Input
              id="target-age"
              inputMode="numeric"
              value={values.targetRetirementAge}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  targetRetirementAge: event.target.value,
                }))
              }
              onBlur={() => void handleBlur()}
              placeholder="Must be greater than current age"
            />
            {errors.targetRetirementAge ? (
              <p className="text-[13px] font-normal text-[var(--off-target)]">
                {errors.targetRetirementAge}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <Label htmlFor="annual-expenses">Annual retirement expenses</Label>
            <Input
              id="annual-expenses"
              inputMode="decimal"
              value={values.annualExpenses}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  annualExpenses: event.target.value,
                }))
              }
              onBlur={() => void handleBlur()}
              placeholder="e.g. 42000"
            />
            {errors.annualExpenses ? (
              <p className="text-[13px] font-normal text-[var(--off-target)]">
                {errors.annualExpenses}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-2">
            <Label htmlFor="country-code">Country of residence</Label>
            <select
              id="country-code"
              aria-label="Country of residence"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={values.countryCode}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  countryCode: event.target.value,
                }))
              }
              onBlur={() => void handleBlur()}
            >
              <option value="">Select a country</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
            {errors.countryCode ? (
              <p className="text-[13px] font-normal text-[var(--off-target)]">
                {errors.countryCode}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => void handleBack()}
          disabled={step === 1}
        >
          Back
        </Button>

        {step < TOTAL_STEPS ? (
          <Button onClick={() => void handleNext()}>Next</Button>
        ) : (
          <Button onClick={() => void handleSubmit()}>Finish</Button>
        )}
      </footer>
    </section>
  )
}

export default OnboardingWizard
