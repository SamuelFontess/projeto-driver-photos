import * as React from "react"

import { cn } from "@/src/lib/utils"

type AlertVariant = "error" | "success" | "info"

interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  info: "border-primary/30 bg-primary/10 text-primary",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function Alert({ variant = "info", children, className }: AlertProps) {
  return (
    <div className={cn("rounded-md border px-4 py-3 text-sm", variantClasses[variant], className)}>
      {children}
    </div>
  )
}