import { describe, expect, it } from "vitest"

import { calculateFireNumberFromAnnualExpenses } from "./fireNumber"

describe("calculateFireNumberFromAnnualExpenses", () => {
  it("uses integer-cent arithmetic for FIRE number with default 4% SWR", () => {
    expect(calculateFireNumberFromAnnualExpenses(42000)).toBe(1050000)
  })

  it("recomputes FIRE number based on custom SWR", () => {
    expect(calculateFireNumberFromAnnualExpenses(42000, 5)).toBe(840000)
    expect(calculateFireNumberFromAnnualExpenses(42000, 3.5)).toBe(1200000)
  })

  it("rounds annual expenses to cents before FIRE multiplication", () => {
    expect(calculateFireNumberFromAnnualExpenses(1234.567)).toBe(30864.25)
  })

  it("throws for zero or negative annual expenses", () => {
    expect(() => calculateFireNumberFromAnnualExpenses(0)).toThrow()
    expect(() => calculateFireNumberFromAnnualExpenses(-10)).toThrow()
  })

  it("throws for SWR values outside allowed range", () => {
    expect(() => calculateFireNumberFromAnnualExpenses(42000, 0.9)).toThrow()
    expect(() => calculateFireNumberFromAnnualExpenses(42000, 10.1)).toThrow()
  })
})
