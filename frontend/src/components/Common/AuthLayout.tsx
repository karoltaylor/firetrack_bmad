import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Footer } from "./Footer"
import { ResponsivePage } from "./ResponsiveLayout"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="layout-safe grid min-h-svh lg:grid-cols-2">
      <div className="bg-muted dark:bg-zinc-900 relative hidden lg:flex lg:items-center lg:justify-center">
        <Logo variant="full" className="h-16" asLink={false} />
      </div>
      <div className="layout-safe flex min-w-0 flex-col py-6 md:py-10">
        <ResponsivePage className="flex h-full flex-col gap-4">
          <div className="flex justify-end">
            <Appearance />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">{children}</div>
          </div>
          <Footer />
        </ResponsivePage>
      </div>
    </div>
  )
}
