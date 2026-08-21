import type { ChatUsage } from "@/api/chat"

export interface ContextUsageMeterProps {
  usage: ChatUsage | null
  hasCompactionNotice: boolean
}

const WARN_THRESHOLD_PCT = 80
const COMPACTION_NOTICE = "Earlier messages were summarized to save context."

export function ContextUsageMeter({ usage, hasCompactionNotice }: ContextUsageMeterProps) {
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
      {hasCompactionNotice && <p className="mt-1">{COMPACTION_NOTICE}</p>}
    </div>
  )
}
