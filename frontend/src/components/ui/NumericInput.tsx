import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface NumericInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "inputMode" | "onChange" | "onBlur" | "value"
  > {
  /** Controlled numeric value; null means empty */
  value?: number | null
  /** BCP-47 locale tag, e.g. "en-US", "pl-PL", "de-DE". Defaults to "en-US" */
  locale?: string
  /** Minimum allowed value; clamps on blur */
  min?: number
  /** Maximum allowed value; clamps on blur */
  max?: number
  /** Called on blur with the parsed + clamped number (or null if empty) */
  onValueChange?: (value: number | null) => void
  /** Decimal precision for display formatting (default: 2) */
  fractionDigits?: number
}

/**
 * Detect the group (thousands) and decimal separators for a given locale.
 */
function getLocaleFormatParts(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89)
  const group = parts.find((p) => p.type === "group")?.value ?? ","
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? "."
  return { group, decimal }
}

/**
 * Parse a locale-formatted string back to a number.
 * Returns null for empty or non-finite input.
 */
function parseLocaleNumber(str: string, locale: string): number | null {
  if (!str || str.trim() === "") return null
  const { group, decimal } = getLocaleFormatParts(locale)
  // Strip group separators, replace decimal with '.'
  // We need to handle multi-byte group separators (e.g. non-breaking space U+00A0 for pl-PL)
  const groupRegex = new RegExp(group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
  const normalized = str.trim().split(groupRegex).join("").replace(decimal, ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/**
 * Format a number using Intl.NumberFormat with grouping separators.
 */
function formatNumber(value: number, locale: string, fractionDigits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  }).format(value)
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      locale = "en-US",
      min,
      max,
      onValueChange,
      fractionDigits = 2,
      className,
      id,
      "aria-describedby": externalDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const internalRef = React.useRef<HTMLInputElement>(null)

    // Merge external ref with internal ref
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

    // displayValue is the formatted string shown to the user
    const [displayValue, setDisplayValue] = React.useState<string>(() => {
      if (value == null) return ""
      return formatNumber(value, locale, fractionDigits)
    })

    // clampMessage is shown below the input for 4 seconds after a clamp event
    const [clampMessage, setClampMessage] = React.useState<string>("")
    const [clampVisible, setClampVisible] = React.useState(false)
    const clampTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const clampFadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync displayValue when the external `value` prop changes
    React.useEffect(() => {
      if (value == null) {
        setDisplayValue("")
      } else {
        setDisplayValue(formatNumber(value, locale, fractionDigits))
      }
    }, [value, locale, fractionDigits])

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawInput = event.target.value
        const cursorPos = event.target.selectionStart ?? 0

        // Detect separators for the current locale
        const { group, decimal } = getLocaleFormatParts(locale)

        // Allow only digits, the decimal separator, and a leading minus sign
        // Strip everything else (including group separators that will be re-added)
        const groupRegex = new RegExp(group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        const rawBeforeCursor = rawInput.slice(0, cursorPos)
        const digitsBeforeCursor = rawBeforeCursor.replace(/\D/g, "").length

        // Build a clean string: strip group separators, keep digits + decimal + leading minus
        const allowedChars = new RegExp(
          `[^0-9${decimal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\-]`,
          "g",
        )
        const strippedAll = rawInput.replace(groupRegex, "").replace(allowedChars, "")
        // Enforce minus sign only at the start; remove any mid-string minus signs
        const leadingMinus = strippedAll.startsWith("-") ? "-" : ""
        const stripped = leadingMinus + strippedAll.replace(/-/g, "")

        // Split by decimal separator to preserve fractional part
        const decimalParts = stripped.split(decimal)
        const integerPart = decimalParts[0]
        const fractionalPart = decimalParts.length > 1 ? decimalParts.slice(1).join("") : null

        if (stripped === "" || stripped === "-") {
          setDisplayValue(stripped)
          return
        }

        // Parse the clean number
        const numericStr = fractionalPart != null ? `${integerPart}.${fractionalPart}` : integerPart
        const n = Number(numericStr)

        let formatted: string
        if (!Number.isFinite(n) || numericStr === "") {
          formatted = stripped
        } else if (fractionalPart != null) {
          // User is in the middle of typing a decimal part — keep the decimal separator visible
          const intFormatted = integerPart
            ? formatNumber(Number(integerPart.replace("-", "")) * (n < 0 ? -1 : 1), locale, 0)
            : integerPart
          formatted = `${intFormatted}${decimal}${fractionalPart}`
        } else {
          formatted = formatNumber(n, locale, fractionDigits)
        }

        setDisplayValue(formatted)

        // Restore caret: count digits before cursor in old input,
        // then find same digit-count position in new formatted string.
        // When digitsBeforeCursor is 0 the cursor should stay at position 0.
        requestAnimationFrame(() => {
          if (!internalRef.current) return
          if (digitsBeforeCursor === 0) {
            internalRef.current.setSelectionRange(0, 0)
            return
          }
          let digitCount = 0
          let newCursor = formatted.length
          for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) digitCount++
            if (digitCount >= digitsBeforeCursor) {
              newCursor = i + 1
              break
            }
          }
          internalRef.current.setSelectionRange(newCursor, newCursor)
        })
      },
      [locale, fractionDigits],
    )

    const handleBlur = React.useCallback(() => {
      const parsed = parseLocaleNumber(displayValue, locale)

      if (parsed == null) {
        onValueChange?.(null)
        return
      }

      let clamped = parsed
      let wasClampedMsg = ""

      if (max !== undefined && parsed > max) {
        clamped = max
        wasClampedMsg = `Clamped to max ${max}`
      } else if (min !== undefined && parsed < min) {
        clamped = min
        wasClampedMsg = `Clamped to min ${min}`
      }

      // Update display to clamped value
      const clampedDisplay = formatNumber(clamped, locale, fractionDigits)
      setDisplayValue(clampedDisplay)

      if (wasClampedMsg) {
        setClampMessage(wasClampedMsg)
        setClampVisible(true)
        if (clampTimerRef.current) clearTimeout(clampTimerRef.current)
        if (clampFadeTimerRef.current) clearTimeout(clampFadeTimerRef.current)
        clampTimerRef.current = setTimeout(() => {
          setClampVisible(false)
          // Clear message after fade transition completes
          clampFadeTimerRef.current = setTimeout(() => setClampMessage(""), 300)
        }, 4000)
      }

      onValueChange?.(clamped)
    }, [displayValue, locale, fractionDigits, min, max, onValueChange])

    const handlePaste = React.useCallback(
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault()
        const pasted = event.clipboardData.getData("text")

        const { decimal } = getLocaleFormatParts(locale)
        let normalized = pasted.trim()

        // Heuristic: determine which separator is the decimal in the pasted value.
        // Look at the LAST separator character (comma or period) — it is most likely the decimal.
        // e.g. "1.234,56" → last sep is ',' → comma is decimal; periods are group separators
        // e.g. "1,234.56" → last sep is '.' → period is decimal; commas are group separators
        const lastCommaIdx = normalized.lastIndexOf(",")
        const lastPeriodIdx = normalized.lastIndexOf(".")

        if (decimal === ".") {
          // en-US style: expect period as decimal
          if (lastCommaIdx > lastPeriodIdx) {
            // Pasted uses comma as decimal (EU style): remove periods and spaces (group seps), replace comma with period
            normalized = normalized.replace(/[.\s ]/g, "").replace(",", ".")
          } else {
            // Already period-decimal style: remove commas and spaces (group separators)
            normalized = normalized.replace(/[,\s ]/g, "")
          }
        } else if (decimal === ",") {
          // pl-PL/de-DE style: expect comma as decimal
          if (lastPeriodIdx > lastCommaIdx) {
            // Pasted uses period as decimal (en-US style): remove commas (group seps), replace period with comma
            normalized = normalized.replace(/,/g, "").replace(".", ",")
          } else {
            // Already comma-decimal style: remove periods and spaces (group separators)
            normalized = normalized.replace(/[.\s ]/g, "")
          }
        } else {
          // Other locale decimal: strip all non-digit/decimal/minus chars
          const decEsc = decimal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          normalized = normalized.replace(new RegExp(`[^0-9${decEsc}\\-]`, "g"), "")
        }

        // Now parse the normalized value using the locale
        const n = parseLocaleNumber(normalized, locale)
        if (n == null) return

        const formatted = formatNumber(n, locale, fractionDigits)
        setDisplayValue(formatted)
      },
      [locale, fractionDigits],
    )

    // Cleanup timers on unmount
    React.useEffect(() => {
      return () => {
        if (clampTimerRef.current) clearTimeout(clampTimerRef.current)
        if (clampFadeTimerRef.current) clearTimeout(clampFadeTimerRef.current)
      }
    }, [])

    const helperId = id ? `${id}-clamp-helper` : undefined

    return (
      <div className="w-full">
        <Input
          ref={internalRef}
          id={id}
          type="text"
          inputMode="decimal"
          className={cn("font-mono tabular-nums", className)}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onPaste={handlePaste}
          aria-describedby={
            externalDescribedBy
              ? `${externalDescribedBy}${helperId ? ` ${helperId}` : ""}`
              : helperId
          }
          {...rest}
        />
        {clampMessage && (
          <p
            id={helperId}
            role="status"
            aria-live="polite"
            className={cn(
              "mt-1 font-sans text-[13px] font-normal text-[var(--off-target)] transition-opacity duration-300",
              clampVisible ? "opacity-100" : "opacity-0",
            )}
          >
            {clampMessage}
          </p>
        )}
      </div>
    )
  },
)

NumericInput.displayName = "NumericInput"

export { NumericInput }
