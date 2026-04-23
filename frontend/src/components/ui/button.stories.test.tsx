// @vitest-environment happy-dom

import axe from "axe-core"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { composeStories } from "@storybook/react"

import * as ButtonStories from "./button.stories"

const { Default } = composeStories(ButtonStories)

describe("Button story accessibility", () => {
  it("has zero axe violations for the default state", async () => {
    render(<Default />)

    const result = await axe.run(document.body)
    expect(result.violations).toHaveLength(0)
  })
})
