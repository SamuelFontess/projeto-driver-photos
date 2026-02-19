import { Loader2 } from "lucide-react"

export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}