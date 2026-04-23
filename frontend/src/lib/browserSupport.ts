export type BrowserSupportResult = {
  supported: boolean
  browserLabel: string
  minVersion: string
}

const parseMajorVersion = (
  userAgent: string,
  pattern: RegExp,
): number | null => {
  const match = userAgent.match(pattern)
  if (!match || !match[1]) {
    return null
  }
  const parsed = Number.parseInt(match[1], 10)
  return Number.isNaN(parsed) ? null : parsed
}

export const detectBrowserSupport = (
  userAgent: string,
): BrowserSupportResult => {
  const ua = userAgent ?? ""

  if (/MSIE|Trident/.test(ua)) {
    return {
      supported: false,
      browserLabel: "Internet Explorer",
      minVersion: "Not supported",
    }
  }

  const edgeVersion = parseMajorVersion(ua, /Edg\/(\d+)/)
  if (edgeVersion !== null) {
    return {
      supported: edgeVersion >= 100,
      browserLabel: "Edge",
      minVersion: "100+",
    }
  }

  const firefoxVersion = parseMajorVersion(ua, /Firefox\/(\d+)/)
  if (firefoxVersion !== null) {
    return {
      supported: firefoxVersion >= 110,
      browserLabel: "Firefox",
      minVersion: "110+",
    }
  }

  const isIosSafari = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua)
  const safariVersion = parseMajorVersion(ua, /Version\/(\d+)/)
  if (isIosSafari && safariVersion !== null) {
    return {
      supported: safariVersion >= 16,
      browserLabel: "iOS Safari",
      minVersion: "16+",
    }
  }

  const chromeVersion = parseMajorVersion(ua, /Chrome\/(\d+)/)
  const isChrome = chromeVersion !== null && !/Edg\//.test(ua)
  if (isChrome) {
    const isAndroid = /Android/.test(ua)
    return {
      supported: chromeVersion >= 100,
      browserLabel: isAndroid ? "Chrome Android" : "Chrome",
      minVersion: "100+",
    }
  }

  const isDesktopSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|Edg/.test(ua) &&
    safariVersion !== null
  if (isDesktopSafari) {
    return {
      supported: safariVersion >= 16,
      browserLabel: "Safari",
      minVersion: "16+",
    }
  }

  return {
    supported: true,
    browserLabel: "Unknown browser",
    minVersion: "n/a",
  }
}

export default detectBrowserSupport
