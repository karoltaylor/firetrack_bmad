// @vitest-environment happy-dom

import axe from "axe-core"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { composeStories } from "@storybook/react"

import * as NumericInputStories from "./NumericInput.stories"

const {
  Empty,
  Focused,
  Filled,
  Error: ErrorStory,
  Clamped,
} = composeStories(NumericInputStories)

describe("NumericInput story accessibility", () => {
  it("has zero axe violations for the Empty state", async () => {
    const { container } = render(
      <main>
        <Empty />
      </main>,
    )
    const result = await axe.run(container)
    expect(result.violations).toHaveLength(0)
  })

  it("has zero axe violations for the Focused state", async () => {
    const { container } = render(
      <main>
        <Focused />
      </main>,
    )
    const result = await axe.run(container)
    expect(result.violations).toHaveLength(0)
  })

  it("has zero axe violations for the Filled state", async () => {
    const { container } = render(
      <main>
        <Filled />
      </main>,
    )
    const result = await axe.run(container)
    expect(result.violations).toHaveLength(0)
  })

  it("has zero axe violations for the Error state", async () => {
    const { container } = render(
      <main>
        <ErrorStory />
      </main>,
    )
    const result = await axe.run(container)
    expect(result.violations).toHaveLength(0)
  })

  it("has zero axe violations for the Clamped state", async () => {
    const { container } = render(
      <main>
        <Clamped />
      </main>,
    )
    const result = await axe.run(container)
    expect(result.violations).toHaveLength(0)
  })
})
