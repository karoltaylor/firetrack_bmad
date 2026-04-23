import { describe, expect, it } from "vitest"

import { detectBrowserSupport } from "./browserSupport"

describe("detectBrowserSupport", () => {
  it("flags IE as unsupported", () => {
    const result = detectBrowserSupport(
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
    )
    expect(result.supported).toBe(false)
  })

  it("supports modern desktop Chrome", () => {
    const result = detectBrowserSupport(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    )
    expect(result.supported).toBe(true)
  })

  it("requires minimum iOS Safari baseline", () => {
    const unsupported = detectBrowserSupport(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
    )
    const supported = detectBrowserSupport(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    )

    expect(unsupported.supported).toBe(false)
    expect(supported.supported).toBe(true)
  })
})
