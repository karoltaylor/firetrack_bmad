import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import {
  ResponsiveGrid,
  ResponsiveMainColumn,
  ResponsivePage,
} from "@/components/Common/ResponsiveLayout"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/auth/login",
      })
    }
  },
})

function Layout() {
  return (
    <SidebarProvider className="layout-safe">
      <AppSidebar />
      <SidebarInset className="layout-safe min-w-0">
        <header className="sticky top-0 z-10 border-b">
          <ResponsivePage className="flex h-16 items-center">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </ResponsivePage>
        </header>
        <main id="main-content" className="layout-safe flex-1 py-6 md:py-8">
          <ResponsivePage>
            <ResponsiveGrid>
              <ResponsiveMainColumn>
                <Outlet />
              </ResponsiveMainColumn>
            </ResponsiveGrid>
          </ResponsivePage>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
