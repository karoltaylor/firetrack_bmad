import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { applyThemeToRoot, resolveTheme } from "@/components/theme-provider"

const cssPath = path.resolve(__dirname, "../index.css")
const htmlPath = path.resolve(__dirname, "../../index.html")
const buttonPath = path.resolve(__dirname, "./ui/button.tsx")
const sidebarPath = path.resolve(__dirname, "./ui/sidebar.tsx")
const authLayoutPath = path.resolve(__dirname, "./Common/AuthLayout.tsx")
const appLayoutPath = path.resolve(__dirname, "../routes/_layout.tsx")
const useMobilePath = path.resolve(__dirname, "../hooks/useMobile.ts")
const dataTablePath = path.resolve(__dirname, "./Common/DataTable.tsx")

const cssSource = readFileSync(cssPath, "utf8")
const htmlSource = readFileSync(htmlPath, "utf8")
const buttonSource = readFileSync(buttonPath, "utf8")
const sidebarSource = readFileSync(sidebarPath, "utf8")
const authLayoutSource = readFileSync(authLayoutPath, "utf8")
const appLayoutSource = readFileSync(appLayoutPath, "utf8")
const useMobileSource = readFileSync(useMobilePath, "utf8")
const dataTableSource = readFileSync(dataTablePath, "utf8")
const fontsDirPath = path.resolve(__dirname, "../../public/fonts")

const rootBlock = cssSource.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? ""
const lightBlock =
  cssSource.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1] ?? ""
const themeBlock = cssSource.match(/@theme\s*\{([\s\S]*?)\}/)?.[1] ?? ""
const inlineThemeBlock =
  cssSource.match(/@theme inline\s*\{([\s\S]*?)\}/)?.[1] ?? ""

const toRelativeLuminance = (hex: string): number => {
  const normalized = hex.replace("#", "")
  const channels = [0, 2, 4].map((index) =>
    Number.parseInt(normalized.slice(index, index + 2), 16),
  )

  const [r, g, b] = channels.map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })

  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

const toContrastRatio = (foreground: string, background: string): number => {
  const fg = toRelativeLuminance(foreground)
  const bg = toRelativeLuminance(background)
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

const getTokenValue = (scope: string, token: string): string => {
  const match = scope.match(new RegExp(`${token}:\\s*([^;]+);`))
  return match?.[1]?.trim() ?? ""
}

const getPreloadedFontHrefs = (): string[] => {
  const parsedDocument = new DOMParser().parseFromString(
    htmlSource,
    "text/html",
  )
  return Array.from(
    parsedDocument.querySelectorAll(
      'link[rel="preload"][as="font"][type="font/woff2"]',
    ),
  )
    .filter((link) => link.hasAttribute("crossorigin"))
    .map((link) => link.getAttribute("href") ?? "")
    .filter((href): href is string => href.length > 0)
}

const expectHex = (actual: string, expected: string) => {
  expect(actual.toLowerCase()).toBe(expected.toLowerCase())
}

const getGeometrySnapshot = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  const computed = window.getComputedStyle(element)

  return {
    rect: {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
    },
    width: computed.width,
    height: computed.height,
    minHeight: computed.minHeight,
    paddingTop: computed.paddingTop,
    paddingRight: computed.paddingRight,
    paddingBottom: computed.paddingBottom,
    paddingLeft: computed.paddingLeft,
  }
}

describe("design token contract", () => {
  it("defines required neutral and semantic tokens with exact values", () => {
    expectHex(getTokenValue(rootBlock, "--bg-primary"), "#0A0A0B")
    expectHex(getTokenValue(rootBlock, "--bg-elevated"), "#141416")
    expectHex(getTokenValue(rootBlock, "--border-default"), "#222226")
    expectHex(getTokenValue(rootBlock, "--text-primary"), "#F4F4F5")
    expectHex(getTokenValue(rootBlock, "--text-secondary"), "#A1A1A6")
    expectHex(getTokenValue(rootBlock, "--text-tertiary"), "#797982")
    expectHex(getTokenValue(rootBlock, "--accent"), "#7C6BFF")
    expectHex(getTokenValue(rootBlock, "--gain"), "#3FB950")
    expectHex(getTokenValue(rootBlock, "--loss"), "#F85149")
    expectHex(getTokenValue(rootBlock, "--off-target"), "#D97757")
    expectHex(getTokenValue(rootBlock, "--preview"), "#71717A")
    expectHex(getTokenValue(rootBlock, "--confirmed"), "#7C6BFF")
    expectHex(getTokenValue(rootBlock, "--muted"), "#A1A1A6")
  })

  it("defines light mode overrides through data-theme", () => {
    expectHex(getTokenValue(lightBlock, "--bg-primary"), "#FAFAFA")
    expectHex(getTokenValue(lightBlock, "--bg-elevated"), "#FFFFFF")
    expectHex(getTokenValue(lightBlock, "--border-default"), "#E4E4E7")
    expectHex(getTokenValue(lightBlock, "--text-primary"), "#111113")
    expectHex(getTokenValue(lightBlock, "--text-secondary"), "#52525B")
    expectHex(getTokenValue(lightBlock, "--text-tertiary"), "#71717A")
    expectHex(getTokenValue(lightBlock, "--gain"), "#16A34A")
    expectHex(getTokenValue(lightBlock, "--loss"), "#DC2626")
    expectHex(getTokenValue(lightBlock, "--off-target"), "#C2410C")
    expectHex(getTokenValue(lightBlock, "--muted"), "#52525B")
  })

  it("ships spacing, radius, shadow, and motion tokens", () => {
    expect(getTokenValue(rootBlock, "--space-1")).toBe("4px")
    expect(getTokenValue(rootBlock, "--space-20")).toBe("80px")
    expect(getTokenValue(rootBlock, "--radius-sm")).toBe("4px")
    expect(getTokenValue(rootBlock, "--radius-md")).toBe("8px")
    expect(getTokenValue(rootBlock, "--radius-lg")).toBe("12px")
    expect(getTokenValue(rootBlock, "--shadow-sm")).toContain("0 1px 2px")
    expect(getTokenValue(rootBlock, "--shadow-md")).toContain("0 4px 12px")
    expect(getTokenValue(rootBlock, "--motion-instant")).toBe("0ms")
    expect(getTokenValue(rootBlock, "--motion-fast")).toBe("120ms")
    expect(getTokenValue(rootBlock, "--motion-standard")).toBe("200ms")
    expect(getTokenValue(rootBlock, "--motion-deliberate")).toBe("400ms")
    expect(getTokenValue(rootBlock, "--motion-cinematic")).toBe("10s")
  })

  it("maps theme utilities and typography from source token variables", () => {
    expect(themeBlock).toContain("--font-sans:")
    expect(themeBlock).toContain("--font-mono:")
    expect(themeBlock).toContain("--text-ticker--line-height:")
    expect(themeBlock).toContain("--text-body--line-height:")
    expect(themeBlock).toContain("--spacing-1:")
    expect(themeBlock).toContain("--radius-sm:")
    expect(themeBlock).toContain("--shadow-sm:")
    expect(themeBlock).toContain("--ease-standard:")

    expect(inlineThemeBlock).toContain("--text-ticker: var(--type-ticker);")
    expect(inlineThemeBlock).toContain("--text-hero: var(--type-hero);")
    expect(inlineThemeBlock).toContain("--text-body: var(--type-body);")
    expect(inlineThemeBlock).toContain("--text-caption: var(--type-caption);")
    expect(themeBlock).toContain('"Inter Fallback"')
    expect(themeBlock).toContain('"JetBrains Mono Fallback"')
    expect(themeBlock).toContain('"IBM Plex Mono"')
  })

  it("defines self-hosted font faces with swap loading and Latin subsets", () => {
    const interWeights = [400, 500, 600]
    const monoWeights = [400, 500]
    const latinRangeToken = "U+0000-00ff"
    const latinExtRangeToken = "U+0100-017f"

    for (const weight of interWeights) {
      const matches =
        cssSource.match(
          new RegExp(
            `font-family:\\s*"Inter";[\\s\\S]*?font-weight:\\s*${weight};`,
            "g",
          ),
        ) ?? []
      expect(matches.length).toBeGreaterThanOrEqual(2)
    }

    for (const weight of monoWeights) {
      const matches =
        cssSource.match(
          new RegExp(
            `font-family:\\s*"JetBrains Mono";[\\s\\S]*?font-weight:\\s*${weight};`,
            "g",
          ),
        ) ?? []
      expect(matches.length).toBeGreaterThanOrEqual(2)
    }

    expect(cssSource).toContain("font-display: swap;")
    expect(cssSource).toContain(latinRangeToken)
    expect(cssSource).toContain(latinExtRangeToken)
    expect(cssSource).toContain(".tabular-nums-ui")
    expect(cssSource).toContain(".financial-numeric")
  })

  it("defines fallback metric overrides for CLS-safe font swaps", () => {
    const interFallbackMatch = cssSource.match(
      /font-family:\s*"Inter Fallback";[\s\S]*?size-adjust:\s*[\d.]+%;/,
    )
    const monoFallbackMatch = cssSource.match(
      /font-family:\s*"JetBrains Mono Fallback";[\s\S]*?size-adjust:\s*[\d.]+%;/,
    )

    expect(interFallbackMatch?.[0]).toContain("ascent-override:")
    expect(interFallbackMatch?.[0]).toContain("descent-override:")
    expect(interFallbackMatch?.[0]).toContain("line-gap-override:")
    expect(monoFallbackMatch?.[0]).toContain("ascent-override:")
    expect(monoFallbackMatch?.[0]).toContain("descent-override:")
    expect(monoFallbackMatch?.[0]).toContain("line-gap-override:")
  })
})

describe("font preload strategy", () => {
  it("preloads only medium (500) Inter and JetBrains Mono variants", () => {
    const preloadedWoff2Files = getPreloadedFontHrefs()

    expect(preloadedWoff2Files.sort()).toEqual(
      [
        "/fonts/inter-latin-500-normal.woff2",
        "/fonts/inter-latin-ext-500-normal.woff2",
        "/fonts/jetbrains-mono-latin-500-normal.woff2",
        "/fonts/jetbrains-mono-latin-ext-500-normal.woff2",
      ].sort(),
    )
  })

  it("ensures each declared and preloaded font file exists on disk", () => {
    const declaredFontFiles = Array.from(
      cssSource.matchAll(/\/fonts\/([a-z0-9-]+\.woff2)/gi),
      (match) => match[1],
    )
    const preloadedFontFiles = getPreloadedFontHrefs().map((href) =>
      href.replace("/fonts/", ""),
    )
    const uniqueFontFiles = Array.from(
      new Set([...declaredFontFiles, ...preloadedFontFiles]),
    )

    for (const fontFile of uniqueFontFiles) {
      expect(existsSync(path.join(fontsDirPath, fontFile))).toBe(true)
    }
  })
})

describe("contrast requirements", () => {
  it("meets AA for standard UI text/background pairs", () => {
    const darkAaPairs: [string, string][] = [
      ["#F4F4F5", "#0A0A0B"],
      ["#A1A1A6", "#0A0A0B"],
      ["#797982", "#0A0A0B"],
      ["#F4F4F5", "#141416"],
    ]
    const lightAaPairs: [string, string][] = [
      ["#111113", "#FAFAFA"],
      ["#52525B", "#FAFAFA"],
      ["#111113", "#FFFFFF"],
    ]

    for (const [foreground, background] of [...darkAaPairs, ...lightAaPairs]) {
      expect(toContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
        4.5,
      )
    }
  })

  it("meets AAA for hero numeric foreground/background pairs", () => {
    const heroPairs: [string, string][] = [
      ["#F4F4F5", "#0A0A0B"],
      ["#111113", "#FAFAFA"],
    ]

    for (const [foreground, background] of heroPairs) {
      expect(toContrastRatio(foreground, background)).toBeGreaterThanOrEqual(7)
    }
  })
})

describe("theme switching behavior", () => {
  it("resolves system preference into explicit dark/light value", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
    expect(resolveTheme("light", true)).toBe("light")
  })

  it("writes data-theme and keeps .dark class compatibility", () => {
    const root = document.documentElement
    root.className = ""
    root.dataset.theme = ""

    applyThemeToRoot(root, "dark")
    expect(root.dataset.theme).toBe("dark")
    expect(root.classList.contains("dark")).toBe(true)
    expect(root.classList.contains("light")).toBe(false)

    applyThemeToRoot(root, "light")
    expect(root.dataset.theme).toBe("light")
    expect(root.classList.contains("dark")).toBe(false)
    expect(root.classList.contains("light")).toBe(true)
  })

  it("keeps shell geometry stable while toggling themes", () => {
    const shell = document.createElement("div")
    const header = document.createElement("header")
    const sidebar = document.createElement("aside")
    const main = document.createElement("main")

    header.style.cssText = "height: 64px; width: 100%;"
    sidebar.style.cssText = "width: 16rem; min-height: 100vh;"
    main.style.cssText = "padding: 24px; min-height: 100vh;"

    shell.append(header, sidebar, main)
    document.body.append(shell)

    const before = [header, sidebar, main].map(getGeometrySnapshot)

    applyThemeToRoot(document.documentElement, "dark")
    applyThemeToRoot(document.documentElement, "light")

    const after = [header, sidebar, main].map(getGeometrySnapshot)
    expect(after).toEqual(before)
    shell.remove()
  })
})

describe("accent interaction policy", () => {
  it("uses opacity modulation for accent hover/active states", () => {
    expect(buttonSource).toMatch(/hover:bg-accent\/\d+/)
    expect(buttonSource).not.toMatch(/hover:bg-accent(?!\/)/)

    const disallowedSidebarStates =
      sidebarSource.match(/(?:hover|active):bg-sidebar-accent(?!\/)/g) ?? []
    expect(disallowedSidebarStates).toHaveLength(0)
    expect(sidebarSource).toMatch(/hover:bg-sidebar-accent\/\d+/)
  })
})

describe("responsive layout and typography contract", () => {
  it("defines breakpoints and layout tokens for the responsive grid contract", () => {
    expect(themeBlock).toContain("--breakpoint-sm: 40rem;")
    expect(themeBlock).toContain("--breakpoint-lg: 64rem;")
    expect(themeBlock).toContain("--breakpoint-2xl: 90rem;")

    expect(getTokenValue(rootBlock, "--layout-container-max")).toBe("1200px")
    expect(getTokenValue(rootBlock, "--layout-gutter-desktop")).toBe("24px")
    expect(getTokenValue(rootBlock, "--layout-margin-desktop")).toBe("24px")
    expect(getTokenValue(rootBlock, "--layout-grid-columns-desktop")).toBe("12")
  })

  it("uses clamp heading tokens while body and UI tokens stay fixed rem", () => {
    expect(getTokenValue(rootBlock, "--type-hero")).toBe(
      "clamp(1.875rem, 1.2vw + 1.6rem, 2.5rem)",
    )
    expect(getTokenValue(rootBlock, "--type-h1")).toBe(
      "clamp(1.5rem, 1vw + 1.25rem, 1.75rem)",
    )
    expect(getTokenValue(rootBlock, "--type-h2")).toBe(
      "clamp(1.25rem, 0.8vw + 1.05rem, 1.375rem)",
    )
    expect(getTokenValue(rootBlock, "--type-h3")).toBe(
      "clamp(1.0625rem, 0.5vw + 0.95rem, 1.125rem)",
    )

    expect(getTokenValue(rootBlock, "--type-body")).toBe("0.9375rem")
    expect(getTokenValue(rootBlock, "--type-ui")).toBe("0.875rem")
    expect(getTokenValue(rootBlock, "--type-meta")).toBe("0.8125rem")
    expect(getTokenValue(rootBlock, "--type-caption")).toBe("0.75rem")
  })

  it("keeps mobile breakpoint logic aligned between css and useMobile hook", () => {
    expect(useMobileSource).toMatch(/const MOBILE_BREAKPOINT_REM = 40/)
    expect(useMobileSource).toContain("MOBILE_MEDIA_QUERY")
    expect(useMobileSource).toContain("setIsMobile(mql.matches)")
  })

  it("applies shell reflow guardrails to prevent horizontal overflow", () => {
    expect(authLayoutSource).not.toContain("overflow-x-clip")
    expect(appLayoutSource).not.toContain("overflow-x-clip")
    expect(cssSource).not.toContain("overflow-x: clip")
    expect(appLayoutSource).toContain("min-w-0")
  })

  it("uses container-query responsive controls with viewport fallback classes", () => {
    expect(dataTableSource).toContain("@container/table-pagination")
    expect(dataTableSource).toContain("@lg/table-pagination:flex-row")
    expect(dataTableSource).toContain("sm:flex-row")
    expect(dataTableSource).toContain("table-fixed")
    expect(dataTableSource).not.toContain("min-w-[42rem]")
  })
})
