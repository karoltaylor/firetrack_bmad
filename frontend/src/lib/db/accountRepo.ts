/**
 * Account repository — typed read/write operations for the `accounts`
 * IndexedDB store.
 *
 * TODO: Integration test needed — happy-dom lacks IndexedDB; use Playwright
 * or a browser-native runner. Deferred per Epic 1 retro action A4.
 */

import { type AccountRecord, getDB } from "./indexeddb"

const generateId = (): string => crypto.randomUUID()

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Adds a new account. Generates `id` and `createdAt` automatically.
 */
export const addAccount = async (
  input: Omit<AccountRecord, "id" | "createdAt">,
): Promise<AccountRecord> => {
  const db = await getDB()
  const record: AccountRecord = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  await db.add("accounts", record)
  return record
}

/**
 * Deletes an account by id.
 */
export const deleteAccount = async (id: string): Promise<void> => {
  const db = await getDB()
  await db.delete("accounts", id)
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a single account by id, or null if not found.
 */
export const getAccount = async (id: string): Promise<AccountRecord | null> => {
  const db = await getDB()
  return (await db.get("accounts", id)) ?? null
}

/**
 * Returns all accounts.
 */
export const getAllAccounts = async (): Promise<AccountRecord[]> => {
  const db = await getDB()
  return db.getAll("accounts")
}
