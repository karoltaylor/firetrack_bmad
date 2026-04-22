import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: import.meta.env.MODE,
})
