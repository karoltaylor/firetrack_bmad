import { describe, expect, it } from "vitest"
import { fromCents, toCents } from "./indexeddb"

describe("toCents", () => {
  it("converts whole dollars to cents", () => {
    expect(toCents(1)).toBe(100)
    expect(toCents(10)).toBe(1000)
    expect(toCents(0)).toBe(0)
  })

  it("converts fractional dollars to integer cents (rounds)", () => {
    expect(toCents(1.99)).toBe(199)
    expect(toCents(0.01)).toBe(1)
    expect(toCents(0.005)).toBe(1) // Math.round rounds 0.5 up
  })

  it("handles negative values (e.g. sell orders)", () => {
    expect(toCents(-1.5)).toBe(-150)
    expect(toCents(-0.01)).toBe(-1)
  })

  it("never returns a float", () => {
    const result = toCents(1.001)
    expect(Number.isInteger(result)).toBe(true)
  })
})

describe("fromCents", () => {
  it("converts cents back to dollars", () => {
    expect(fromCents(100)).toBe(1)
    expect(fromCents(199)).toBe(1.99)
    expect(fromCents(0)).toBe(0)
  })

  it("handles negative cents", () => {
    expect(fromCents(-150)).toBe(-1.5)
  })
})
