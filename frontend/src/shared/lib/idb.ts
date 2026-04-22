import { type IDBPDatabase, openDB } from "idb"

export const getDB = (): Promise<IDBPDatabase> =>
  openDB("firetrack-db", 1, {
    upgrade(_db) {
      // stores added per-story
    },
  })
