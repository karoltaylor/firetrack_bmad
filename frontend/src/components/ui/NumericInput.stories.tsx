import type { Meta, StoryObj } from "@storybook/react"

import { NumericInput } from "./NumericInput"

const meta = {
  title: "UI/NumericInput",
  component: NumericInput,
  tags: ["autodocs"],
  parameters: {
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  args: {
    "aria-label": "Amount",
    locale: "en-US",
  },
} satisfies Meta<typeof NumericInput>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    value: null,
    placeholder: "0.00",
  },
}

export const Focused: Story = {
  args: {
    value: null,
    placeholder: "0.00",
    autoFocus: true,
  },
}

export const Filled: Story = {
  args: {
    value: 1234.56,
  },
}

export const Error: Story = {
  args: {
    value: null,
    "aria-invalid": "true",
    "aria-describedby": "amount-error",
    placeholder: "0.00",
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <p id="amount-error" style={{ color: "var(--loss)", fontSize: "13px", marginTop: "4px" }}>
          Please enter a valid amount.
        </p>
      </div>
    ),
  ],
}

export const Clamped: Story = {
  args: {
    value: 100,
    max: 100,
    id: "clamped-input",
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input")
    if (!input) return
    // Set a value beyond max and trigger blur to show clamp message
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set
    nativeInputValueSetter?.call(input, "150")
    input.dispatchEvent(new Event("change", { bubbles: true }))
    input.dispatchEvent(new Event("blur", { bubbles: true }))
  },
}
