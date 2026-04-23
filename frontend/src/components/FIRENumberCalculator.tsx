import { type ReactNode, useEffect, useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateFireNumberFromAnnualExpenses } from "@/lib/fireNumber"
import { formatMetric } from "@/shared/lib/formatMetric"

export type FIRENumberCalculatorState = {
  currentAge: number | null
  targetRetirementAge: number | null
  annualExpenses: number | null
  fireNumber: number | null
}

type FIRENumberCalculatorProps = {
  initialCurrentAge: number | null
  initialTargetRetirementAge: number | null
  initialAnnualExpenses: number | null
  baseCurrency: string
  swrPercent: number
  metricTrailing?: ReactNode
  onStateChange?: (state: FIRENumberCalculatorState) => void
}

const toInputValue = (value: number | null): string =>
  value === null ? "" : String(value)

const parseInteger = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0 || !/^\d+$/.test(trimmed)) {
    return null
  }
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const parsePositiveNumber = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export function FIRENumberCalculator({
  initialCurrentAge,
  initialTargetRetirementAge,
  initialAnnualExpenses,
  baseCurrency,
  swrPercent,
  metricTrailing,
  onStateChange,
}: FIRENumberCalculatorProps) {
  const [currentAgeInput, setCurrentAgeInput] = useState(
    toInputValue(initialCurrentAge),
  )
  const [targetRetirementAgeInput, setTargetRetirementAgeInput] = useState(
    toInputValue(initialTargetRetirementAge),
  )
  const [annualExpensesInput, setAnnualExpensesInput] = useState(
    toInputValue(initialAnnualExpenses),
  )

  useEffect(() => {
    setCurrentAgeInput(toInputValue(initialCurrentAge))
    setTargetRetirementAgeInput(toInputValue(initialTargetRetirementAge))
    setAnnualExpensesInput(toInputValue(initialAnnualExpenses))
  }, [initialAnnualExpenses, initialCurrentAge, initialTargetRetirementAge])

  const currentAge = useMemo(
    () => parseInteger(currentAgeInput),
    [currentAgeInput],
  )
  const targetRetirementAge = useMemo(
    () => parseInteger(targetRetirementAgeInput),
    [targetRetirementAgeInput],
  )
  const annualExpenses = useMemo(
    () => parsePositiveNumber(annualExpensesInput),
    [annualExpensesInput],
  )

  const fireNumber = useMemo(() => {
    if (annualExpenses === null) {
      return null
    }
    try {
      return calculateFireNumberFromAnnualExpenses(annualExpenses, swrPercent)
    } catch {
      return null
    }
  }, [annualExpenses, swrPercent])

  useEffect(() => {
    onStateChange?.({
      currentAge,
      targetRetirementAge,
      annualExpenses,
      fireNumber,
    })
  }, [
    annualExpenses,
    currentAge,
    fireNumber,
    onStateChange,
    targetRetirementAge,
  ])

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">FIRE number</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-3xl tabular-nums">
            {fireNumber === null
              ? "—"
              : formatMetric(fireNumber, { currency: baseCurrency })}
          </p>
          {metricTrailing}
        </div>
        <p className="text-muted-foreground text-sm">
          Based on annual expenses:{" "}
          {annualExpenses === null
            ? "—"
            : formatMetric(annualExpenses, { currency: baseCurrency })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="fire-calc-current-age">Current age</Label>
          <Input
            id="fire-calc-current-age"
            inputMode="numeric"
            value={currentAgeInput}
            onChange={(event) => setCurrentAgeInput(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fire-calc-target-age">Target retirement age</Label>
          <Input
            id="fire-calc-target-age"
            inputMode="numeric"
            value={targetRetirementAgeInput}
            onChange={(event) =>
              setTargetRetirementAgeInput(event.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fire-calc-annual-expenses">Annual expenses</Label>
          <Input
            id="fire-calc-annual-expenses"
            inputMode="decimal"
            value={annualExpensesInput}
            onChange={(event) => setAnnualExpensesInput(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default FIRENumberCalculator
