import { describe, expect, it } from "vitest"

import { calculateFireNumberFromAnnualExpenses } from "./fireNumber"

describe("calculateFireNumberFromAnnualExpenses", () => {
  it("uses integer-cent arithmetic for FIRE number", () => {
    expect(calculateFireNumberFromAnnualExpenses(42000)).toBe(1050000)
  })

  it("rounds annual expenses to cents before FIRE multiplication", () => {
    expect(calculateFireNumberFromAnnualExpenses(1234.567)).toBe(30864.25)
  })

  it("throws for zero or negative annual expenses", () => {
    expect(() => calculateFireNumberFromAnnualExpenses(0)).toThrow()
    expect(() => calculateFireNumberFromAnnualExpenses(-10)).toThrow()
  })
})
