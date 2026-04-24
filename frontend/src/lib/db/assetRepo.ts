/**
 * Asset repository — typed read/write operations for the `assets`
 * IndexedDB store.
 *
 * TODO: Integration test needed — happy-dom lacks IndexedDB; use Playwright
 * or a browser-native runner. Deferred per Epic 1 retro action A4.
 */

import { type AssetRecord, getDB } from "./indexeddb"

const generateId = (): string => crypto.randomUUID()

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Adds a new asset. Generates `id` and `createdAt` automatically.
 */
export const addAsset = async (
  input: Omit<AssetRecord, "id" | "createdAt">,
): Promise<AssetRecord> => {
  const db = await getDB()
  const record: AssetRecord = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  await db.add("assets", record)
  return record
}

/**
 * Deletes an asset by id.
 */
export const deleteAsset = async (id: string): Promise<void> => {
  const db = await getDB()
  await db.delete("assets", id)
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a single asset by id, or null if not found.
 */
export const getAsset = async (id: string): Promise<AssetRecord | null> => {
  const db = await getDB()
  return (await db.get("assets", id)) ?? null
}

/**
 * Returns all assets.
 */
export const getAllAssets = async (): Promise<AssetRecord[]> => {
  const db = await getDB()
  return db.getAll("assets")
}
