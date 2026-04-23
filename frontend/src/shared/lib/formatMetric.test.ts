import { describe, expect, it } from "vitest"

import { formatMetric } from "./formatMetric"

describe("formatMetric", () => {
  it("formats value as EUR currency by default", () => {
    expect(formatMetric(1050000)).toContain("€")
  })

  it("supports explicit currency option", () => {
    expect(formatMetric(2500, { currency: "USD" })).toContain("$")
  })

  it("formats percentages", () => {
    expect(formatMetric(0.0425, { kind: "percentage" })).toContain("%")
  })

  it("formats duration in years and months", () => {
    expect(formatMetric(40, { kind: "duration" })).toBe("3y 4m")
  })

  it("formats dates", () => {
    expect(
      formatMetric("2026-01-15", { kind: "date", locale: "en-US" }),
    ).toContain("2026")
  })

  it("can append methodology metadata", () => {
    expect(
      formatMetric(1050000, {
        methodology: { label: "SWR 4% baseline", asOf: "2026-04-23" },
        withMethodology: true,
      }),
    ).toContain("Methodology: SWR 4% baseline as of 2026-04-23")
  })
})
