import { useMemo } from "react"

import { detectBrowserSupport } from "@/lib/browserSupport"

export function BrowserSupportBanner() {
  const support = useMemo(() => {
    if (typeof navigator === "undefined") {
      return { supported: true, browserLabel: "Unknown", minVersion: "n/a" }
    }
    return detectBrowserSupport(navigator.userAgent)
  }, [])

  if (support.supported) {
    return null
  }

  return (
    <output
      aria-live="polite"
      className="border-b border-[var(--off-target)] bg-[color-mix(in_srgb,var(--off-target)_14%,transparent)] px-4 py-2 text-sm"
    >
      Your browser is below FIREtrack's supported baseline. Please upgrade to a
      current version of Chrome, Safari, Firefox, or Edge (minimum{" "}
      {support.browserLabel} {support.minVersion}) for the best experience.
    </output>
  )
}

export default BrowserSupportBanner
