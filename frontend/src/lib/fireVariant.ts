export type FireVariant = "Lean FIRE" | "Standard FIRE" | "Fat FIRE"

export const FIRE_VARIANT_THRESHOLDS_EUR = {
  leanMaxExclusive: 40_000,
  standardMaxInclusive: 100_000,
} as const

export type EcbRatesSnapshot = {
  asOf: string
  rates: Record<string, number>
}

export const FALLBACK_ECB_RATES: EcbRatesSnapshot = {
  asOf: "2026-04-23",
  rates: {
    EUR: 1,
    PLN: 4.27,
    USD: 1.09,
    GBP: 0.86,
    CAD: 1.48,
    AUD: 1.67,
  },
}

type FrankfurterRatesResponse = {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

export const fetchLatestEcbRates = async (): Promise<EcbRatesSnapshot> => {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=EUR")
    if (!response.ok) {
      return FALLBACK_ECB_RATES
    }
    const payload = (await response.json()) as FrankfurterRatesResponse
    return {
      asOf: payload.date || FALLBACK_ECB_RATES.asOf,
      rates: { EUR: 1, ...payload.rates },
    }
  } catch {
    return FALLBACK_ECB_RATES
  }
}

export const convertAnnualExpensesToEur = (
  annualExpenses: number,
  currency: string,
  snapshot: EcbRatesSnapshot = FALLBACK_ECB_RATES,
): { annualExpensesEur: number; rateAsOf: string } => {
  const rate = snapshot.rates[currency]
  if (!rate) {
    return { annualExpensesEur: annualExpenses, rateAsOf: snapshot.asOf }
  }
  const annualExpensesEur = annualExpenses / rate
  return { annualExpensesEur, rateAsOf: snapshot.asOf }
}

export const getFireVariantFromAnnualExpenses = (
  annualExpensesEur: number,
): FireVariant => {
  if (annualExpensesEur < FIRE_VARIANT_THRESHOLDS_EUR.leanMaxExclusive) {
    return "Lean FIRE"
  }
  if (annualExpensesEur <= FIRE_VARIANT_THRESHOLDS_EUR.standardMaxInclusive) {
    return "Standard FIRE"
  }
  return "Fat FIRE"
}
