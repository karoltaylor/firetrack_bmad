type FormatMetricOptions = {
  currency?: string
  locale?: string
}

export const formatMetric = (
  value: number,
  options: FormatMetricOptions = {},
): string => {
  const locale = options.locale ?? "en-US"
  const currency = options.currency ?? "EUR"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
