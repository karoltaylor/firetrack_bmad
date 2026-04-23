import { afterEach, describe, expect, it, vi } from "vitest"

import {
  convertAnnualExpensesToEur,
  FALLBACK_ECB_RATES,
  fetchLatestEcbRates,
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

describe("fetchLatestEcbRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns rates from backend payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          as_of: "2026-05-01",
          rates: { USD: 1.08, PLN: 4.2 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchLatestEcbRates()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/rates/latest?from=EUR"),
    )
    expect(result).toEqual({
      asOf: "2026-05-01",
      rates: { EUR: 1, USD: 1.08, PLN: 4.2 },
    })
  })

  it("falls back when backend responds with non-OK status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 503, statusText: "Service Unavailable" }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchLatestEcbRates()

    expect(result).toEqual(FALLBACK_ECB_RATES)
  })

  it("falls back when request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchLatestEcbRates()

    expect(result).toEqual(FALLBACK_ECB_RATES)
  })
})
