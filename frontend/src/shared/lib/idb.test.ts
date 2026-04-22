import { describe, expect, it } from "vitest"
import { getDB } from "./idb"

describe("idb stub", () => {
  it("exports a getDB function", () => {
    expect(typeof getDB).toBe("function")
  })
})
