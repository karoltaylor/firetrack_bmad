import { describe, expect, it } from "vitest"

import { getCpiSourceForCountry, isOnboardingComplete } from "./userProfile"

describe("userProfile helpers", () => {
  it("maps EU countries to eurostat_hicp", () => {
    expect(getCpiSourceForCountry("PL")).toBe("eurostat_hicp")
  })

  it("maps non-EU countries to world_bank", () => {
    expect(getCpiSourceForCountry("US")).toBe("world_bank")
  })

  it("returns completion state based on completedAt", () => {
    expect(isOnboardingComplete(null)).toBe(false)
    expect(
      isOnboardingComplete({
        id: "current",
        currentAge: 30,
        targetRetirementAge: 55,
        annualExpenses: 42000,
        countryCode: "PL",
        cpi_source: "eurostat_hicp",
        lastStep: 4,
        updatedAt: new Date().toISOString(),
        completedAt: null,
      }),
    ).toBe(false)
    expect(
      isOnboardingComplete({
        id: "current",
        currentAge: 30,
        targetRetirementAge: 55,
        annualExpenses: 42000,
        countryCode: "PL",
        cpi_source: "eurostat_hicp",
        lastStep: 4,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }),
    ).toBe(true)
  })
})
