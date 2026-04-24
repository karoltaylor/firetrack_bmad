// Central export barrel for the IndexedDB layer.
// All components and hooks import from here — never from sub-modules directly.

export {
  addAccount,
  deleteAccount,
  getAccount,
  getAllAccounts,
} from "./accountRepo"
export {
  addAsset,
  deleteAsset,
  getAllAssets,
  getAsset,
} from "./assetRepo"
export type {
  AccountRecord,
  AssetClass,
  AssetRecord,
  FiretrackDb,
  SettingsRecord,
  TransactionRecord,
} from "./indexeddb"
export {
  fromCents,
  getDB,
  IndexedDBUnavailableError,
  toCents,
} from "./indexeddb"

export {
  deleteSetting,
  getSetting,
  setSetting,
} from "./settingsRepo"

export {
  addTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransaction,
  getTransactionsByAccount,
  getTransactionsByDateRange,
  getTransactionsByTicker,
} from "./transactionRepo"
