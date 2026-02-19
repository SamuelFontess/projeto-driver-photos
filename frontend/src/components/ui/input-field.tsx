import * as React from "react"

import { cn } from "@/src/lib/utils"
import { Input } from "./input"
import { Label } from "./label"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  hint?: string
  error?: string
}

export function InputField({
  label,
  id,
  hint,
  error,
  className,
  ...props
}: InputFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className={cn(error ? "border-destructive" : "", className)} {...props} />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
