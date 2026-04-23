import { describe, expect, it } from "vitest"

import {
  convertAnnualExpensesToEur,
  FALLBACK_ECB_RATES,
  getFireVariantFromAnnualExpenses,
} from "./fireVariant"

describe("getFireVariantFromAnnualExpenses", () => {
  it("returns Lean FIRE below 40k EUR", () => {
    expect(getFireVariantFromAnnualExpenses(39_999.99)).toBe("Lean FIRE")
  })

  it("returns Standard FIRE from 40k to 100k EUR", () => {
    expect(getFireVariantFromAnnualExpenses(40_000)).toBe("Standard FIRE")
    expect(getFireVariantFromAnnualExpenses(100_000)).toBe("Standard FIRE")
  })

  it("returns Fat FIRE above 100k EUR", () => {
    expect(getFireVariantFromAnnualExpenses(100_000.01)).toBe("Fat FIRE")
  })
})

describe("convertAnnualExpensesToEur", () => {
  it("converts non-EUR currency using ECB reference rate", () => {
    const result = convertAnnualExpensesToEur(427_000, "PLN")
    expect(result.annualExpensesEur).toBeCloseTo(100_000, 2)
    expect(result.rateAsOf).toBe("2026-04-23")
  })

  it("falls back to input amount when rate is unavailable", () => {
    const result = convertAnnualExpensesToEur(
      50_000,
      "UNKNOWN",
      FALLBACK_ECB_RATES,
    )
    expect(result.annualExpensesEur).toBe(50_000)
  })
})
