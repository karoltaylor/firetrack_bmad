import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const uiDirPath = path.dirname(fileURLToPath(import.meta.url))
const srcRootPath = path.resolve(uiDirPath, "..", "..")
const rootRoutePath = path.join(srcRootPath, "routes", "__root.tsx")
const indexCssPath = path.join(srcRootPath, "index.css")

const requiredOwnedFiles = [
  "alert-dialog.tsx",
  "button.tsx",
  "command.tsx",
  "dialog.tsx",
  "input.tsx",
  "popover.tsx",
  "sheet.tsx",
  "tabs.tsx",
  "tooltip.tsx",
]

const getSelectedCommandItem = () => {
  return (
    document.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]') ??
    document.querySelector<HTMLElement>('[cmdk-item][data-selected="true"]')
  )
}

afterEach(() => {
  cleanup()
})

describe("shadcn ownership contract", () => {
  it("keeps required primitives as local TSX source files", () => {
    for (const filename of requiredOwnedFiles) {
      const fullPath = path.join(uiDirPath, filename)
      expect(existsSync(fullPath)).toBe(true)
      const source = readFileSync(fullPath, "utf8")
      expect(source).toMatch(/function\s+[A-Z]|export\s+\{/)
      expect(source).not.toContain("from 'react-bootstrap'")
      expect(source).not.toContain('from "react-bootstrap"')
    }
  })

  it("exposes all required primitives as importable local components", () => {
    expect(Button).toBeTypeOf("function")
    expect(Input).toBeTypeOf("function")
    expect(Dialog).toBeTypeOf("function")
    expect(Sheet).toBeTypeOf("function")
    expect(Popover).toBeTypeOf("function")
    expect(Tooltip).toBeTypeOf("function")
    expect(AlertDialog).toBeTypeOf("function")
    expect(Tabs).toBeTypeOf("function")
    expect(Command).toBeTypeOf("function")
  })
})

describe("radix keyboard behavior", () => {
  it("closes Dialog with Escape and returns focus to trigger", async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
          <button type="button">Inside action</button>
        </DialogContent>
      </Dialog>,
    )

    const trigger = screen.getByRole("button", { name: "Open dialog" })
    await user.click(trigger)
    expect(screen.getByRole("dialog")).toBeDefined()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("keeps focus trapped in AlertDialog content while open", async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button">Open alert</button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm delete</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const trigger = screen.getByRole("button", { name: "Open alert" })
    await user.click(trigger)
    const dialog = screen.getByRole("alertdialog")

    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" })
    const continueButton = within(dialog).getByRole("button", { name: "Continue" })

    cancelButton.focus()
    await user.tab()
    expect(document.activeElement).toBe(continueButton)
    await user.tab()
    expect(document.activeElement).toBe(cancelButton)

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("supports arrow-key navigation in Command list", async () => {
    const user = userEvent.setup()
    render(
      <Command>
        <CommandInput placeholder="Search actions" />
        <CommandList>
          <CommandGroup heading="Main actions">
            <CommandItem>Open dashboard</CommandItem>
            <CommandItem>Open settings</CommandItem>
            <CommandItem>Sign out</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    )

    const input = screen.getByPlaceholderText("Search actions")
    await user.click(input)
    const initialSelectedText = getSelectedCommandItem()?.textContent ?? null

    await user.keyboard("{ArrowDown}")
    const afterArrowDownText = getSelectedCommandItem()?.textContent ?? null
    expect(afterArrowDownText).not.toBeNull()
    if (initialSelectedText) {
      expect(afterArrowDownText).not.toBe(initialSelectedText)
    }

    await user.keyboard("{ArrowDown}")
    const secondArrowDownText = getSelectedCommandItem()?.textContent ?? null
    expect(secondArrowDownText).not.toBeNull()
    if (afterArrowDownText) {
      expect(secondArrowDownText).not.toBe(afterArrowDownText)
    }

    await user.keyboard("{ArrowUp}")
    const afterArrowUpText = getSelectedCommandItem()?.textContent ?? null
    expect(afterArrowUpText).toBe(afterArrowDownText)
  })

  it("closes Popover with Escape and returns focus to trigger", async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">Open popover</button>
        </PopoverTrigger>
        <PopoverContent>
          <button type="button">Popover action</button>
        </PopoverContent>
      </Popover>,
    )

    const trigger = screen.getByRole("button", { name: "Open popover" })
    await user.click(trigger)
    expect(screen.getByRole("button", { name: "Popover action" })).toBeDefined()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("button", { name: "Popover action" })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("keeps keyboard users from getting trapped in Sheet", async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Before sheet</button>
        <Sheet>
          <SheetTrigger asChild>
            <button type="button">Open sheet</button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
            <button type="button">Inside sheet action</button>
          </SheetContent>
        </Sheet>
        <button type="button">After sheet</button>
      </>,
    )

    const trigger = screen.getByRole("button", { name: "Open sheet" })
    await user.click(trigger)
    const insideAction = screen.getByRole("button", { name: "Inside sheet action" })
    insideAction.focus()
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

describe("render sanity for newly added primitives", () => {
  it("renders Popover, Sheet, Tabs, and Tooltip without runtime errors", async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button">Open popover</button>
            </PopoverTrigger>
            <PopoverContent>Popover body</PopoverContent>
          </Popover>
          <Sheet>
            <SheetTrigger asChild>
              <button type="button">Open sheet</button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Sheet title</SheetTitle>
              <SheetDescription>Sheet body</SheetDescription>
            </SheetContent>
          </Sheet>
          <Tabs defaultValue="first">
            <TabsList>
              <TabsTrigger value="first">First</TabsTrigger>
              <TabsTrigger value="second">Second</TabsTrigger>
            </TabsList>
            <TabsContent value="first">First panel</TabsContent>
            <TabsContent value="second">Second panel</TabsContent>
          </Tabs>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button">Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Helpful hint</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Open popover" }))
    expect(screen.getByText("Popover body")).toBeDefined()

    await user.click(screen.getByRole("button", { name: "Open sheet" }))
    expect(screen.getByRole("dialog")).toBeDefined()
  })
})

describe("app-level keyboard scaffolding", () => {
  it("loads TanStack devtools only via dynamic import (no static devtool imports in root route)", () => {
    expect(existsSync(rootRoutePath)).toBe(true)
    const source = readFileSync(rootRoutePath, "utf8")
    expect(source).not.toMatch(/@tanstack\/react-query-devtools/)
    expect(source).not.toMatch(/@tanstack\/react-router-devtools/)
    expect(source).toContain('import("@/dev/RootDevtools")')
  })

  it("defines skip links and live regions in root route", () => {
    expect(existsSync(rootRoutePath)).toBe(true)
    const source = readFileSync(rootRoutePath, "utf8")
    expect(source).toContain("Skip to ticker")
    expect(source).toContain("Skip to main content")
    expect(source).toContain("Skip to navigation")
    expect(source).toContain('aria-live="polite"')
    expect(source).toContain('aria-live="assertive"')
  })

  it("applies global focus-visible ring and skip-link styles", () => {
    expect(existsSync(indexCssPath)).toBe(true)
    const source = readFileSync(indexCssPath, "utf8")
    expect(source).toContain(":focus-visible")
    expect(source).toContain("outline: 2px solid var(--accent)")
    expect(source).toContain(".skip-link")
  })
})
