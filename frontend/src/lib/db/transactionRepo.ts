/**
 * Transaction repository — typed read/write operations for the `transactions`
 * IndexedDB store.
 *
 * All queries that filter rows MUST use named indexes (by_date, by_ticker,
 * by_account) rather than a full-store scan. This satisfies AC #6 which
 * requires < 100ms for filtered reads across 10,000 rows.
 *
 * TODO: Integration test needed — happy-dom lacks IndexedDB; use Playwright
 * or a browser-native runner. Deferred per Epic 1 retro action A4.
 */

import { getDB, type TransactionRecord } from "./indexeddb"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateId = (): string => crypto.randomUUID()

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Adds a new transaction. Generates `id` and `createdAt` automatically.
 */
export const addTransaction = async (
  input: Omit<TransactionRecord, "id" | "createdAt">,
): Promise<TransactionRecord> => {
  const db = await getDB()
  const record: TransactionRecord = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  await db.add("transactions", record)
  return record
}

/**
 * Deletes a transaction by id.
 */
export const deleteTransaction = async (id: string): Promise<void> => {
  const db = await getDB()
  await db.delete("transactions", id)
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a single transaction by id, or null if not found.
 */
export const getTransaction = async (
  id: string,
): Promise<TransactionRecord | null> => {
  const db = await getDB()
  return (await db.get("transactions", id)) ?? null
}

/**
 * Returns all transactions (no filter). Use with caution on large stores.
 * For filtered queries, always use the index-based helpers below.
 */
export const getAllTransactions = async (): Promise<TransactionRecord[]> => {
  const db = await getDB()
  return db.getAll("transactions")
}

/**
 * Returns transactions whose `ticker` field matches the given value.
 * Uses the `by_ticker` index — no full-store scan.
 */
export const getTransactionsByTicker = async (
  ticker: string,
): Promise<TransactionRecord[]> => {
  const db = await getDB()
  return db.getAllFromIndex("transactions", "by_ticker", ticker)
}

/**
 * Returns transactions whose `account_id` field matches the given value.
 * Uses the `by_account` index — no full-store scan.
 */
export const getTransactionsByAccount = async (
  accountId: string,
): Promise<TransactionRecord[]> => {
  const db = await getDB()
  return db.getAllFromIndex("transactions", "by_account", accountId)
}

/**
 * Returns transactions whose `date` falls within [from, to] (inclusive).
 * Uses the `by_date` index and IDBKeyRange.bound — no full-store scan.
 *
 * @param from ISO date string, e.g. "2024-01-01"
 * @param to   ISO date string, e.g. "2024-12-31"
 */
export const getTransactionsByDateRange = async (
  from: string,
  to: string,
): Promise<TransactionRecord[]> => {
  const db = await getDB()
  const range = IDBKeyRange.bound(from, to)
  return db.getAllFromIndex("transactions", "by_date", range)
}
