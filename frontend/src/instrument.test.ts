import type * as Sentry from "@sentry/react"
import { describe, expect, it } from "vitest"

import { scrubSentryEvent } from "./instrument"

describe("sentry scrubbing", () => {
  it("redacts sensitive financial and credential keys recursively", () => {
    const event = {
      extra: {
        password: "super-secret",
        nested: {
          token: "abc",
          portfolio_value: 123456,
          note: "safe",
        },
      },
      request: {
        data: {
          amount: 1200,
          description: "test",
        },
      },
    }

    const scrubbed = scrubSentryEvent(event as unknown as Sentry.ErrorEvent)
    const scrubbedExtra = scrubbed.extra as Record<string, unknown>
    const scrubbedNested = scrubbedExtra.nested as Record<string, unknown>
    const scrubbedRequest = scrubbed.request as {
      data?: Record<string, unknown>
    }

    expect(scrubbedExtra.password).toBe("[REDACTED]")
    expect(scrubbedNested.token).toBe("[REDACTED]")
    expect(scrubbedNested.portfolio_value).toBe("[REDACTED]")
    expect(scrubbedNested.note).toBe("safe")
    expect(scrubbedRequest.data?.amount).toBe("[REDACTED]")
    expect(scrubbedRequest.data?.description).toBe("test")
  })
})
