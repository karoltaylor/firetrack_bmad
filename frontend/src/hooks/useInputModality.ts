import { useEffect, useMemo, useState } from "react"

export type InputModality = "fine" | "coarse" | "hybrid" | "unknown"

const getMatch = (query: string): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false
  }
  return window.matchMedia(query).matches
}

const resolveModality = (fine: boolean, coarse: boolean): InputModality => {
  if (fine && coarse) {
    return "hybrid"
  }
  if (fine) {
    return "fine"
  }
  if (coarse) {
    return "coarse"
  }
  return "unknown"
}

export const useInputModality = () => {
  const [supportsFinePointer, setSupportsFinePointer] = useState(() =>
    getMatch("(pointer: fine)"),
  )
  const [supportsCoarsePointer, setSupportsCoarsePointer] = useState(() =>
    getMatch("(pointer: coarse)"),
  )
  const [lastUsedModality, setLastUsedModality] =
    useState<InputModality>("unknown")

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return
    }

    const fineQuery = window.matchMedia("(pointer: fine)")
    const coarseQuery = window.matchMedia("(pointer: coarse)")

    const updateMatches = () => {
      setSupportsFinePointer(fineQuery.matches)
      setSupportsCoarsePointer(coarseQuery.matches)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        setLastUsedModality("fine")
        return
      }
      if (event.pointerType === "touch") {
        setLastUsedModality("coarse")
      }
    }

    updateMatches()
    fineQuery.addEventListener("change", updateMatches)
    coarseQuery.addEventListener("change", updateMatches)
    window.addEventListener("pointerdown", onPointerDown)

    return () => {
      fineQuery.removeEventListener("change", updateMatches)
      coarseQuery.removeEventListener("change", updateMatches)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [])

  const detectedModality = useMemo(
    () => resolveModality(supportsFinePointer, supportsCoarsePointer),
    [supportsCoarsePointer, supportsFinePointer],
  )

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }
    const resolved =
      lastUsedModality !== "unknown" ? lastUsedModality : detectedModality
    document.documentElement.dataset.inputModality = resolved
  }, [detectedModality, lastUsedModality])

  return {
    supportsFinePointer,
    supportsCoarsePointer,
    detectedModality,
    activeModality:
      lastUsedModality !== "unknown" ? lastUsedModality : detectedModality,
  }
}

export default useInputModality
