type FormatMetricOptions = {
  kind?: "currency" | "percentage" | "duration" | "date"
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  dateStyle?: "full" | "long" | "medium" | "short"
  methodology?: {
    label: string
    asOf?: string
  }
  withMethodology?: boolean
}

export const formatMetric = (
  value: number | string | Date,
  options: FormatMetricOptions = {},
): string => {
  const locale = options.locale ?? "en-US"
  const kind = options.kind ?? "currency"
  const methodologySuffix =
    options.withMethodology && options.methodology
      ? ` (Methodology: ${options.methodology.label}${options.methodology.asOf ? ` as of ${options.methodology.asOf}` : ""})`
      : ""

  if (kind === "date") {
    const date =
      value instanceof Date
        ? value
        : new Date(typeof value === "string" ? value : Number(value))
    const formatted = new Intl.DateTimeFormat(locale, {
      dateStyle: options.dateStyle ?? "medium",
    }).format(date)
    return `${formatted}${methodologySuffix}`
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `—${methodologySuffix}`
  }

  if (kind === "percentage") {
    const formatted = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: options.minimumFractionDigits ?? 1,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    }).format(value)
    return `${formatted}${methodologySuffix}`
  }

  if (kind === "duration") {
    const totalMonths = Math.max(0, Math.round(value))
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    const formatted =
      years > 0 && months > 0
        ? `${years}y ${months}m`
        : years > 0
          ? `${years}y`
          : `${months}m`
    return `${formatted}${methodologySuffix}`
  }

  const currency = options.currency ?? "EUR"
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value)
  return `${formatted}${methodologySuffix}`
}
