/**
 * @deprecated This stub is superseded by the centralized DB layer at
 * `src/lib/db/indexeddb.ts`.  Import from `@/lib/db` instead.
 *
 * This re-export shim is kept only to prevent build breakage if any legacy
 * import still references this path.  No new code should import from here.
 */
export { getDB } from "@/lib/db/indexeddb"
