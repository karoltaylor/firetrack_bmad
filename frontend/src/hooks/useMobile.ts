import * as React from "react"

const MOBILE_BREAKPOINT_REM = 40
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_REM - 0.001}rem)`

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    setIsMobile(mql.matches)

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }

    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  return !!isMobile
}
