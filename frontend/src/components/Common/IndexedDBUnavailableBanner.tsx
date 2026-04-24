/**
 * Displayed when the browser does not support IndexedDB.
 *
 * FIREtrack free tier stores all financial data locally via IndexedDB.
 * Without it the app cannot function.  This banner informs the user and
 * links to the supported-browser list (reusing the BrowserSupportBanner
 * visual style per AC #5 of Story 2.1).
 */
export function IndexedDBUnavailableBanner() {
  if (typeof indexedDB !== "undefined") {
    return null
  }

  return (
    <output
      aria-live="assertive"
      role="alert"
      className="border-b border-[var(--off-target)] bg-[color-mix(in_srgb,var(--off-target)_14%,transparent)] px-4 py-2 text-sm"
    >
      Your browser does not support IndexedDB, which FIREtrack requires to store
      your financial data locally. Please upgrade to a current version of
      Chrome, Safari, Firefox, or Edge to use FIREtrack.{" "}
      <a
        href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API#browser_compatibility"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        View supported browsers
      </a>
    </output>
  )
}

export default IndexedDBUnavailableBanner
