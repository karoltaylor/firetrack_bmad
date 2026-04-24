/**
 * Settings repository — typed read/write operations for the `settings`
 * IndexedDB store.
 *
 * The `settings` store uses `key` as the keyPath (not `id`), so records are
 * keyed by string (e.g. "theme", "defaultCurrency").
 *
 * TODO: Integration test needed — happy-dom lacks IndexedDB; use Playwright
 * or a browser-native runner. Deferred per Epic 1 retro action A4.
 */

import { getDB, type SettingsRecord } from "./indexeddb"

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Upserts a setting. Creates it if absent; overwrites if present.
 */
export const setSetting = async (
  key: string,
  value: unknown,
): Promise<SettingsRecord> => {
  const db = await getDB()
  const record: SettingsRecord = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  }
  await db.put("settings", record)
  return record
}

/**
 * Deletes a setting by key.
 */
export const deleteSetting = async (key: string): Promise<void> => {
  const db = await getDB()
  await db.delete("settings", key)
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a setting by key, or null if not found.
 */
export const getSetting = async (
  key: string,
): Promise<SettingsRecord | null> => {
  const db = await getDB()
  return (await db.get("settings", key)) ?? null
}
