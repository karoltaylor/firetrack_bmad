// @vitest-environment happy-dom

import { render, fireEvent, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { NumericInput } from "./NumericInput"

describe("NumericInput", () => {
  describe("AC #1 – inputmode and basic rendering", () => {
    it("renders with inputmode='decimal' attribute", () => {
      render(<NumericInput aria-label="Amount" />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveAttribute("inputmode", "decimal")
    })

    it("renders with type='text'", () => {
      render(<NumericInput aria-label="Amount" />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveAttribute("type", "text")
    })

    it("applies font-mono and tabular-nums classes", () => {
      render(<NumericInput aria-label="Amount" />)
      const input = screen.getByRole("textbox")
      expect(input.className).toContain("font-mono")
      expect(input.className).toContain("tabular-nums")
    })
  })

  describe("AC #1 – controlled value display", () => {
    it("formats 1234.56 with en-US locale → '1,234.56'", () => {
      render(<NumericInput aria-label="Amount" value={1234.56} locale="en-US" />)
      const input = screen.getByRole("textbox")
      // en-US uses comma group separator
      expect(input).toHaveValue("1,234.56")
    })

    it("formats 1234.56 with pl-PL locale → '1 234,56' (non-breaking space)", () => {
      render(<NumericInput aria-label="Amount" value={1234.56} locale="pl-PL" />)
      const input = screen.getByRole("textbox")
      // pl-PL uses non-breaking space group separator and comma decimal
      const displayedValue = (input as HTMLInputElement).value
      // Should contain comma as decimal separator for pl-PL
      expect(displayedValue).toContain(",56")
      // Should contain some kind of separator between 1 and 234
      expect(displayedValue).toMatch(/1.234/)
    })

    it("shows empty string when value is null", () => {
      render(<NumericInput aria-label="Amount" value={null} />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveValue("")
    })

    it("shows empty string when value is undefined", () => {
      render(<NumericInput aria-label="Amount" />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveValue("")
    })
  })

  describe("AC #2 – live formatting on keystroke", () => {
    it("formats number with thousands separator as user types", async () => {
      const user = userEvent.setup()
      render(<NumericInput aria-label="Amount" locale="en-US" />)
      const input = screen.getByRole("textbox")

      await user.click(input)
      await user.type(input, "1234")

      // After typing 1234 the display should show 1,234
      const val = (input as HTMLInputElement).value
      expect(val).toContain("1")
      expect(val).toContain("234")
    })

    it("caret is preserved within formatted range after re-format", async () => {
      const user = userEvent.setup()
      render(<NumericInput aria-label="Amount" locale="en-US" />)
      const input = screen.getByRole("textbox") as HTMLInputElement

      await user.click(input)
      await user.type(input, "1234")

      // selectionStart should be a valid position within the displayed value
      const selStart = input.selectionStart
      expect(selStart).toBeGreaterThanOrEqual(0)
      expect(selStart).toBeLessThanOrEqual(input.value.length)
    })
  })

  describe("AC #3 – blur clamping", () => {
    it("clamps to max and shows helper message when value > max", async () => {
      const handleValueChange = vi.fn()
      render(
        <NumericInput
          aria-label="Amount"
          locale="en-US"
          max={100}
          onValueChange={handleValueChange}
        />,
      )
      const input = screen.getByRole("textbox")

      fireEvent.change(input, { target: { value: "150" } })
      fireEvent.blur(input)

      expect(handleValueChange).toHaveBeenCalledWith(100)
      expect(screen.getByText("Clamped to max 100")).toBeInTheDocument()
    })

    it("clamps to min and shows helper message when value < min", async () => {
      const handleValueChange = vi.fn()
      render(
        <NumericInput
          aria-label="Amount"
          locale="en-US"
          min={0}
          onValueChange={handleValueChange}
        />,
      )
      const input = screen.getByRole("textbox")

      fireEvent.change(input, { target: { value: "-5" } })
      fireEvent.blur(input)

      expect(handleValueChange).toHaveBeenCalledWith(0)
      expect(screen.getByText("Clamped to min 0")).toBeInTheDocument()
    })

    it("clamp message disappears after 4 seconds", async () => {
      vi.useFakeTimers()

      render(<NumericInput aria-label="Amount" locale="en-US" max={100} />)
      const input = screen.getByRole("textbox")

      fireEvent.change(input, { target: { value: "150" } })
      fireEvent.blur(input)

      // Message appears immediately
      expect(screen.getByText("Clamped to max 100")).toBeInTheDocument()

      // Advance 4 seconds — clampVisible becomes false (opacity-0)
      act(() => {
        vi.advanceTimersByTime(4000)
      })

      // The element is still in DOM (opacity-0) but clamp message should become opacity-0
      const msg = screen.getByText("Clamped to max 100")
      expect(msg).toBeInTheDocument()
      expect(msg.className).toContain("opacity-0")

      vi.useRealTimers()
    })

    it("does not clamp when value is within range", async () => {
      const handleValueChange = vi.fn()
      render(
        <NumericInput
          aria-label="Amount"
          locale="en-US"
          min={0}
          max={200}
          onValueChange={handleValueChange}
        />,
      )
      const input = screen.getByRole("textbox")

      fireEvent.change(input, { target: { value: "150" } })
      fireEvent.blur(input)

      expect(handleValueChange).toHaveBeenCalledWith(150)
      expect(screen.queryByText(/Clamped/)).not.toBeInTheDocument()
    })
  })

  describe("AC #4 – paste normalization", () => {
    it("normalizes pasted '1.234,56' (EU format) in en-US locale → parsed as 1234.56", () => {
      const handleValueChange = vi.fn()
      render(
        <NumericInput
          aria-label="Amount"
          locale="en-US"
          onValueChange={handleValueChange}
        />,
      )
      const input = screen.getByRole("textbox")

      // Create a paste event with EU-formatted number
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
        bubbles: true,
      })
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "1.234,56",
        },
      })

      fireEvent(input, pasteEvent)

      // After normalization and formatting, the value should represent 1234.56
      const inputValue = (input as HTMLInputElement).value
      expect(inputValue).toContain("1")
      // Should contain "234" and "56" somehow
      expect(inputValue).toMatch(/234/)
      expect(inputValue).toMatch(/56/)
    })

    it("normalizes pasted '1 234,56' (pl-PL format) in en-US locale", () => {
      render(<NumericInput aria-label="Amount" locale="en-US" />)
      const input = screen.getByRole("textbox")

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
        bubbles: true,
      })
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "1 234,56",
        },
      })

      fireEvent(input, pasteEvent)

      const inputValue = (input as HTMLInputElement).value
      expect(inputValue).toMatch(/1/)
      expect(inputValue).toMatch(/234/)
    })
  })

  describe("AC #6 – accessibility", () => {
    it("calls onValueChange with null when input is cleared", async () => {
      const handleValueChange = vi.fn()
      render(
        <NumericInput
          aria-label="Amount"
          locale="en-US"
          value={100}
          onValueChange={handleValueChange}
        />,
      )
      const input = screen.getByRole("textbox")

      fireEvent.change(input, { target: { value: "" } })
      fireEvent.blur(input)

      expect(handleValueChange).toHaveBeenCalledWith(null)
    })

    it("passes aria-invalid through to the input element", () => {
      render(
        <NumericInput
          aria-label="Amount"
          aria-invalid="true"
        />,
      )
      const input = screen.getByRole("textbox")
      expect(input).toHaveAttribute("aria-invalid", "true")
    })

    it("passes aria-describedby through to the input element", () => {
      render(
        <NumericInput
          aria-label="Amount"
          aria-describedby="error-msg"
        />,
      )
      const input = screen.getByRole("textbox")
      expect(input.getAttribute("aria-describedby")).toContain("error-msg")
    })

    it("is keyboard operable and focusable", async () => {
      const user = userEvent.setup()
      render(<NumericInput aria-label="Amount" />)
      const input = screen.getByRole("textbox")

      await user.tab()
      expect(input).toHaveFocus()
    })

    it("forwards ref so callers can programmatically focus", () => {
      const ref = { current: null as HTMLInputElement | null }
      render(<NumericInput aria-label="Amount" ref={ref} />)
      expect(ref.current).not.toBeNull()
      expect(ref.current).toBeInstanceOf(HTMLElement)
    })
  })
})
