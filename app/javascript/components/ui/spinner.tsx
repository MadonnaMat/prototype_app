import type { ReactNode } from "react"
import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

// Decorative by default (aria-hidden) — every current use pairs it with
// visible adjacent text (see PendingLabel) that already conveys the loading
// state; giving the icon its own aria-label as well would both double-announce
// to screen readers ("Loading Saving…") and leak into accessible-name
// queries on the surrounding button/text. Pass role="status"/aria-label
// explicitly to override when a spinner is used with no adjacent text at all.
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2Icon>) {
  return <Loader2Icon aria-hidden="true" data-slot="spinner" className={cn("size-4 animate-spin", className)} {...props} />
}

// A Spinner plus its label text, e.g. "Deleting…" — self-contained (own
// inline-flex layout and gap) so it drops into either a Button or a plain
// block-level container without the caller needing its own flex/gap
// classes. role="status" here (not on the Spinner) announces the visible
// text as a live-region update without double-announcing via the icon.
function PendingLabel({ children }: { children: ReactNode }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5">
      <Spinner />
      {children}
    </span>
  )
}

export { Spinner, PendingLabel }
