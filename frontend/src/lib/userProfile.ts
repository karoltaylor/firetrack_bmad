// UserProfileRecord and CpiSource are defined in the central DB schema to
// avoid circular imports. They are re-exported here for backward compatibility.
export type { CpiSource, UserProfileRecord } from "@/lib/db/indexeddb"

import type { CpiSource, UserProfileRecord } from "@/lib/db/indexeddb"
import { getDB } from "@/lib/db/indexeddb"

type UserProfilePatch = Partial<Omit<UserProfileRecord, "id">>

type CountryOption = {
  code: string
  label: string
  currency: string
  isEu: boolean
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "PL", label: "Poland", currency: "PLN", isEu: true },
  { code: "DE", label: "Germany", currency: "EUR", isEu: true },
  { code: "FR", label: "France", currency: "EUR", isEu: true },
  { code: "ES", label: "Spain", currency: "EUR", isEu: true },
  { code: "IT", label: "Italy", currency: "EUR", isEu: true },
  { code: "NL", label: "Netherlands", currency: "EUR", isEu: true },
  { code: "GB", label: "United Kingdom", currency: "GBP", isEu: false },
  { code: "US", label: "United States", currency: "USD", isEu: false },
  { code: "CA", label: "Canada", currency: "CAD", isEu: false },
  { code: "AU", label: "Australia", currency: "AUD", isEu: false },
]

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const PROFILE_STORE = "user_profile"
const PROFILE_ID = "current"

const defaultUserProfile = (): UserProfileRecord => ({
  id: PROFILE_ID,
  currentAge: null,
  targetRetirementAge: null,
  annualExpenses: null,
  swrPercent: 4,
  countryCode: null,
  baseCurrency: "EUR",
  cpi_source: null,
  lastStep: 1,
  updatedAt: new Date().toISOString(),
  completedAt: null,
})

const notifyUserProfileUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"))
  }
}

export const getCpiSourceForCountry = (countryCode: string): CpiSource => {
  const country = COUNTRY_OPTIONS.find((item) => item.code === countryCode)
  return country?.isEu ? "eurostat_hicp" : "world_bank"
}

export const getCurrencyForCountry = (countryCode: string): string => {
  const country = COUNTRY_OPTIONS.find((item) => item.code === countryCode)
  return country?.currency ?? "EUR"
}

export const getUserProfile = async (): Promise<UserProfileRecord | null> => {
  const db = await getDB()
  return (await db.get(PROFILE_STORE, PROFILE_ID)) ?? null
}

export const upsertUserProfile = async (
  patch: UserProfilePatch,
): Promise<UserProfileRecord> => {
  const db = await getDB()
  const existing =
    (await db.get(PROFILE_STORE, PROFILE_ID)) ?? defaultUserProfile()
  const merged: UserProfileRecord = {
    ...existing,
    ...patch,
    id: PROFILE_ID,
    lastStep: patch.lastStep ?? existing.lastStep,
    completedAt: existing.completedAt ?? patch.completedAt ?? null,
    updatedAt: new Date().toISOString(),
  }
  await db.put(PROFILE_STORE, merged)
  notifyUserProfileUpdated()
  return merged
}

export const clearUserProfile = async (): Promise<void> => {
  const db = await getDB()
  await db.delete(PROFILE_STORE, PROFILE_ID)
  notifyUserProfileUpdated()
}

export const isOnboardingComplete = (
  profile: UserProfileRecord | null,
): boolean => {
  return Boolean(profile?.completedAt)
}
