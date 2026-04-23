import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

export type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

const THEME_QUERY = "(prefers-color-scheme: dark)"
const isBrowser = typeof window !== "undefined"
const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect

const getStorage = (): Storage | null => {
  if (!isBrowser) {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const getSystemPrefersDark = (): boolean => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return true
  }

  return window.matchMedia(THEME_QUERY).matches
}

const parseStoredTheme = (storageKey: string, defaultTheme: Theme): Theme => {
  const storage = getStorage()
  if (!storage) {
    return defaultTheme
  }

  try {
    const storedTheme = storage.getItem(storageKey)
    return storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "system"
      ? storedTheme
      : defaultTheme
  } catch {
    return defaultTheme
  }
}

export const resolveTheme = (
  theme: Theme,
  prefersDark: boolean,
): ResolvedTheme => {
  if (theme === "system") {
    return prefersDark ? "dark" : "light"
  }

  return theme
}

export const applyThemeToRoot = (
  root: HTMLElement,
  resolvedTheme: ResolvedTheme,
) => {
  root.dataset.theme = resolvedTheme
  root.classList.remove("light", "dark")
  root.classList.add(resolvedTheme)
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    parseStoredTheme(storageKey, defaultTheme),
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initialTheme = parseStoredTheme(storageKey, defaultTheme)
    const prefersDark = getSystemPrefersDark()
    return resolveTheme(initialTheme, prefersDark)
  })

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) {
      return
    }

    applyThemeToRoot(window.document.documentElement, resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (
      !isBrowser ||
      theme !== "system" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }

    const mediaQuery = window.matchMedia(THEME_QUERY)
    setResolvedTheme(resolveTheme("system", mediaQuery.matches))

    const handleChange = (event: MediaQueryListEvent) => {
      setResolvedTheme(resolveTheme("system", event.matches))
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [theme])

  const setTheme = (nextTheme: Theme) => {
    const storage = getStorage()

    if (storage) {
      try {
        storage.setItem(storageKey, nextTheme)
      } catch {
        // Ignore storage write failures and keep theme state in memory.
      }
    }

    setThemeState(nextTheme)
    setResolvedTheme(resolveTheme(nextTheme, getSystemPrefersDark()))
  }

  const value = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
