import * as Sentry from "@sentry/react"

const sensitiveKeys = new Set([
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
  "portfolio",
  "portfolio_value",
  "transactions",
  "transaction",
  "amount",
  "balance",
  "financial",
  "decrypted",
])

type UnknownRecord = Record<string, unknown>

const scrubSensitiveValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => scrubSensitiveValue(entry))
  }

  if (value && typeof value === "object") {
    const scrubbed: UnknownRecord = {}
    for (const [key, nested] of Object.entries(value as UnknownRecord)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        scrubbed[key] = "[REDACTED]"
      } else {
        scrubbed[key] = scrubSensitiveValue(nested)
      }
    }
    return scrubbed
  }

  return value
}

export const scrubSentryEvent = (
  event: Sentry.ErrorEvent,
): Sentry.ErrorEvent => {
  return scrubSensitiveValue(event) as Sentry.ErrorEvent
}

const shouldEnableSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  const sentryEnabled = import.meta.env.VITE_SENTRY_ENABLED === "true"
  const isLocal = import.meta.env.MODE === "local"
  return Boolean(dsn) && sentryEnabled && !isLocal
}

export const initSentry = (): void => {
  if (!shouldEnableSentry()) {
    return
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? "dev",
    beforeSend: scrubSentryEvent,
  })
}

export const instrumentRouteTracking = (): void => {
  if (!shouldEnableSentry()) {
    return
  }

  const updateRouteTag = () => {
    Sentry.setTag("route", window.location.pathname)
  }

  updateRouteTag()
  window.addEventListener("popstate", updateRouteTag)

  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  window.history.pushState = function pushStatePatched(...args) {
    const result = originalPushState.apply(this, args)
    updateRouteTag()
    return result
  }

  window.history.replaceState = function replaceStatePatched(...args) {
    const result = originalReplaceState.apply(this, args)
    updateRouteTag()
    return result
  }
}
