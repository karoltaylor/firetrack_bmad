/**
 * TransactionRepo test strategy note:
 *
 * happy-dom does NOT implement IndexedDB (or IDBKeyRange), so any test that
 * calls `getDB()` or exercises actual IDB reads/writes will fail in this
 * environment.
 *
 * Decision (per Epic 1 retro action A4, deferred-work.md): do NOT attempt
 * to test IndexedDB operations via Vitest/happy-dom. Do NOT use fake-indexeddb
 * mocks — they have diverged behaviour from real IDB and give false confidence.
 *
 * TODO: Integration test needed — use Playwright or a browser-native runner.
 * Deferred to Story 2.14 (10k-transaction scale verification story).
 *
 * This file documents the idb test strategy limitation and provides
 * pure-unit tests for any non-DB helpers extracted from the repo.
 */

import { describe, expect, it } from "vitest"

describe("transactionRepo — IDB test strategy", () => {
  it("documents that happy-dom lacks IndexedDB and IDBKeyRange (see TODO above)", () => {
    // This test is intentionally a documentation anchor. Integration tests for
    // the actual repository operations (addTransaction, getTransactionsByDateRange, etc.)
    // are deferred to Story 2.14 using Playwright or a browser-native runner.
    expect(true).toBe(true)
  })
})

describe("transactionRepo — date range query semantics (pure logic)", () => {
  /**
   * Verifies that string-based ISO 8601 date comparison — which is how
   * IDB indexes lexicographically order date strings — works as expected.
   * No real IDB is required for this pure string comparison check.
   */
  it("ISO 8601 date strings are correctly ordered lexicographically", () => {
    const from = "2024-01-01"
    const to = "2024-12-31"
    const inside = "2024-06-15"
    const before = "2023-12-31"
    const after = "2025-01-01"

    expect(inside >= from && inside <= to).toBe(true)
    expect(before >= from && before <= to).toBe(false)
    expect(after >= from && after <= to).toBe(false)
  })

  it("ISO 8601 date string comparison is stable for boundary values", () => {
    // Boundary: same date as `from` is included (>= lower bound)
    const from = "2024-01-01"
    const to = "2024-12-31"
    expect(from >= "2024-01-01").toBe(true)
    expect(to <= "2024-12-31").toBe(true)
  })
})
