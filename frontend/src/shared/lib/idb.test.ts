/**
 * The original idb.ts stub (Story 1.1) opened a `firetrack-db` database with
 * no real stores and only tested `typeof getDB === 'function'`.
 *
 * Story 2.1 supersedes that stub.  The centralized DB layer now lives at
 * `src/lib/db/indexeddb.ts`.  This file retains the import shim path test to
 * confirm the re-export still works, and references the real test suite.
 *
 * @see src/lib/db/indexeddb.test.ts — full toCents/fromCents unit tests
 */

import { describe, expect, it } from "vitest"
import { getDB } from "./idb"

describe("idb shim", () => {
  it("re-exports getDB from the centralized DB layer", () => {
    expect(typeof getDB).toBe("function")
  })
})
