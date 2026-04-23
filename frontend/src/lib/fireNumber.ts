export const calculateFireNumberFromAnnualExpenses = (
  annualExpenses: number,
): number => {
  if (!Number.isFinite(annualExpenses) || annualExpenses <= 0) {
    throw new Error("Annual expenses must be a positive number.")
  }

  const annualExpenseCents = Math.round(annualExpenses * 100)
  const fireNumberCents = annualExpenseCents * 25
  return fireNumberCents / 100
}
