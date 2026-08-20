import { Link } from "react-router"
import type { TaskChange } from "@/api/chat"

export interface ChangesListProps {
  changes: TaskChange[]
}

const ACTION_LABEL: Record<TaskChange["action"], string> = {
  created: "Created",
  updated: "Updated",
  completed: "Completed",
  deleted: "Deleted",
}

const ACTION_CLASS_NAME: Record<TaskChange["action"], string> = {
  created: "text-primary",
  updated: "text-foreground",
  completed: "text-muted-foreground",
  deleted: "text-destructive",
}

export function ChangesList({ changes }: ChangesListProps) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground">No changes yet.</p>
  }

  // Keys are derived from the original (append) order before reversing for display, so an
  // existing row's key doesn't shift — and force a remount — every time a new one arrives.
  const rows = changes.map((change, index) => ({ change, key: `${index}-${change.action}-${change.id}` })).reverse()

  return (
    <div className="divide-y">
      {rows.map(({ change, key }) => (
        <div key={key} className="flex flex-col py-2">
          <span className={`text-xs font-medium ${ACTION_CLASS_NAME[change.action]}`}>
            {ACTION_LABEL[change.action]}
          </span>
          {change.action === "deleted" ? (
            <span className="text-sm">{change.title}</span>
          ) : (
            <Link to={`/tasks/${change.id}/edit`} className="text-sm hover:underline">
              {change.title}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
