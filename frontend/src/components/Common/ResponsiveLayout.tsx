import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function ResponsivePage({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("layout-page layout-safe", className)} {...props} />
}

export function ResponsiveGrid({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("layout-grid layout-safe", className)} {...props} />
}

export function ResponsiveMainColumn({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("layout-main-col min-w-0", className)} {...props} />
}
