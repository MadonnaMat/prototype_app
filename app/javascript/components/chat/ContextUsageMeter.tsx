import type { ChatUsage } from "@/api/chat"

export interface ContextUsageMeterProps {
  usage: ChatUsage | null
  compactionNotice: string | null
}

const WARN_THRESHOLD_PCT = 80

export function ContextUsageMeter({ usage, compactionNotice }: ContextUsageMeterProps) {
  if (!usage) return null

  const pct = Math.min(100, Math.round((usage.promptTokens / usage.contextWindow) * 100))
  const isWarn = pct >= WARN_THRESHOLD_PCT

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={isWarn ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-primary"} style={{ width: `${pct}%` }} />
        </div>
        <span className={isWarn ? "text-destructive" : undefined}>{pct}% of context used</span>
      </div>
      {compactionNotice && <p className="mt-1">{compactionNotice}</p>}
    </div>
  )
}
