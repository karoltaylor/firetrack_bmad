import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FIRENumberCalculator } from "./FIRENumberCalculator"

afterEach(() => {
  cleanup()
})

describe("FIRENumberCalculator", () => {
  it("recomputes FIRE number live when annual expenses change", async () => {
    const user = userEvent.setup()
    render(
      <FIRENumberCalculator
        initialCurrentAge={30}
        initialTargetRetirementAge={55}
        initialAnnualExpenses={40000}
        baseCurrency="EUR"
        swrPercent={4}
      />,
    )

    expect(
      screen.getByText((value) => value.includes("1,000,000")),
    ).toBeDefined()

    const annualExpensesInput = screen.getByLabelText("Annual expenses")
    await user.clear(annualExpensesInput)
    await user.type(annualExpensesInput, "50000")

    expect(
      screen.getByText((value) => value.includes("1,250,000")),
    ).toBeDefined()
  })

  it("emits parsed state updates to parent listeners", async () => {
    const onStateChange = vi.fn()
    const user = userEvent.setup()
    render(
      <FIRENumberCalculator
        initialCurrentAge={31}
        initialTargetRetirementAge={56}
        initialAnnualExpenses={42000}
        baseCurrency="EUR"
        swrPercent={4}
        onStateChange={onStateChange}
      />,
    )

    const targetAgeInput = screen.getByLabelText("Target retirement age")
    await user.clear(targetAgeInput)
    await user.type(targetAgeInput, "60")

    await waitFor(() => {
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentAge: 31,
          targetRetirementAge: 60,
          annualExpenses: 42000,
        }),
      )
    })
  })
})
