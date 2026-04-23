import { toast } from "sonner"

const announceToLiveRegion = (id: string, message: string) => {
  if (typeof document === "undefined") {
    return
  }
  const liveRegion = document.getElementById(id)
  if (!liveRegion) {
    return
  }
  liveRegion.textContent = ""
  requestAnimationFrame(() => {
    liveRegion.textContent = message
  })
}

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    announceToLiveRegion("app-live-polite", description)
    toast.success("Success!", {
      description,
    })
  }

  const showErrorToast = (description: string) => {
    announceToLiveRegion("app-live-assertive", description)
    toast.error("Something went wrong!", {
      description,
    })
  }

  const showFinancialInfoToast = (description: string) => {
    announceToLiveRegion("app-live-polite", description)
    toast.message("Financial information", {
      description,
      duration: Number.POSITIVE_INFINITY,
      dismissible: true,
    })
  }

  return { showSuccessToast, showErrorToast, showFinancialInfoToast }
}

export default useCustomToast
