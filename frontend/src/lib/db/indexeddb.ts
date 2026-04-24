import { type DBSchema, type IDBPDatabase, openDB } from "idb"

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class IndexedDBUnavailableError extends Error {
  constructor() {
    super(
      "IndexedDB is not available in this browser. " +
        "FIREtrack requires a modern browser with IndexedDB support. " +
        "Please upgrade to a current version of Chrome, Safari, Firefox, or Edge.",
    )
    this.name = "IndexedDBUnavailableError"
  }
}

// ---------------------------------------------------------------------------
// Asset class union type
// ---------------------------------------------------------------------------

export type AssetClass =
  | "stock"
  | "etf"
  | "bond"
  | "crypto"
  | "pension"
  | "real_estate"
  | "cash"

// ---------------------------------------------------------------------------
// Record types for each store
// ---------------------------------------------------------------------------

export type TransactionRecord = {
  id: string
  ticker: string
  type: "buy" | "sell" | "dividend"
  quantity: number
  priceCents: number
  currency: string
  account_id: string
  date: string
  createdAt: string
}

export type AssetRecord = {
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  currency: string
  createdAt: string
}

export type AccountRecord = {
  id: string
  name: string
  broker: string | null
  currency: string
  createdAt: string
}

export type SettingsRecord = {
  key: string
  value: unknown
  updatedAt: string
}

// ---------------------------------------------------------------------------
// UserProfileRecord — defined here (central schema) to avoid circular imports.
// userProfile.ts re-exports this type for backward compatibility.
// ---------------------------------------------------------------------------

export type CpiSource = "eurostat_hicp" | "world_bank"

export type UserProfileRecord = {
  id: "current"
  currentAge: number | null
  targetRetirementAge: number | null
  annualExpenses: number | null
  swrPercent: number
  countryCode: string | null
  baseCurrency: string
  cpi_source: CpiSource | null
  lastStep: number
  updatedAt: string
  completedAt: string | null
}

// ---------------------------------------------------------------------------
// DBSchema
// ---------------------------------------------------------------------------

export interface FiretrackDb extends DBSchema {
  user_profile: {
    key: string
    value: UserProfileRecord
  }
  transactions: {
    key: string
    value: TransactionRecord
    indexes: {
      by_date: string
      by_ticker: string
      by_account: string
    }
  }
  assets: {
    key: string
    value: AssetRecord
  }
  accounts: {
    key: string
    value: AccountRecord
  }
  settings: {
    key: string
    value: SettingsRecord
  }
}

// ---------------------------------------------------------------------------
// Upgrade handler — idempotent across all versions
// ---------------------------------------------------------------------------

function upgrade(db: IDBPDatabase<FiretrackDb>, oldVersion: number): void {
  if (oldVersion < 1) {
    // Version 1: user_profile — never recreate if already present
    if (!db.objectStoreNames.contains("user_profile")) {
      db.createObjectStore("user_profile", { keyPath: "id" })
    }
  }

  if (oldVersion < 2) {
    // Version 2: new stores for Epic 2
    if (!db.objectStoreNames.contains("transactions")) {
      const txStore = db.createObjectStore("transactions", { keyPath: "id" })
      txStore.createIndex("by_date", "date")
      txStore.createIndex("by_ticker", "ticker")
      txStore.createIndex("by_account", "account_id")
    }
    if (!db.objectStoreNames.contains("assets")) {
      db.createObjectStore("assets", { keyPath: "id" })
    }
    if (!db.objectStoreNames.contains("accounts")) {
      db.createObjectStore("accounts", { keyPath: "id" })
    }
    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "key" })
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton DB getter
// ---------------------------------------------------------------------------

let dbPromise: ReturnType<typeof openDB<FiretrackDb>> | null = null

/**
 * Returns a shared promise that resolves to the `firetrack` IDB database at
 * version 2.  All reads and writes MUST go through this function — no raw
 * `indexedDB` access is allowed outside this module.
 */
export const getDB = (): ReturnType<typeof openDB<FiretrackDb>> => {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === "undefined") {
    throw new IndexedDBUnavailableError()
  }
  dbPromise = openDB<FiretrackDb>("firetrack", 2, { upgrade }).catch((err) => {
    dbPromise = null
    return Promise.reject(err)
  }) as ReturnType<typeof openDB<FiretrackDb>>
  return dbPromise
}

// ---------------------------------------------------------------------------
// Monetary helpers — integer cents invariant
// ---------------------------------------------------------------------------

/**
 * Converts a display value (float, e.g. 1.99) to integer cents (199).
 * This is the ONLY place cents conversion should happen for write paths.
 */
export const toCents = (value: number): number => Math.round(value * 100)

/**
 * Converts integer cents (199) back to a display value (1.99).
 * This is the ONLY place cents conversion should happen for read paths.
 */
export const fromCents = (cents: number): number => cents / 100
