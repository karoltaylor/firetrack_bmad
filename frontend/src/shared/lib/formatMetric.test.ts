import { describe, expect, it } from "vitest"

import { formatMetric } from "./formatMetric"

describe("formatMetric", () => {
  it("formats value as EUR currency by default", () => {
    expect(formatMetric(1050000)).toContain("€")
  })

  it("supports explicit currency option", () => {
    expect(formatMetric(2500, { currency: "USD" })).toContain("$")
  })
})
