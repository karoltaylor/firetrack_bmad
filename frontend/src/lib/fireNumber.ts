export const calculateFireNumberFromAnnualExpenses = (
  annualExpenses: number,
  swrPercent = 4,
): number => {
  if (!Number.isFinite(annualExpenses) || annualExpenses <= 0) {
    throw new Error("Annual expenses must be a positive number.")
  }
  if (!Number.isFinite(swrPercent) || swrPercent < 1 || swrPercent > 10) {
    throw new Error("SWR must be between 1 and 10.")
  }

  const annualExpenseCents = Math.round(annualExpenses * 100)
  const swrBasisPoints = Math.round(swrPercent * 100)
  const fireNumberCents = Math.round(
    (annualExpenseCents * 10000) / swrBasisPoints,
  )
  return fireNumberCents / 100
}
