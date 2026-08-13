import type { RailsContext } from "react-on-rails"
import { StaticRouter } from "react-router"
import { TaskApp, type TaskAppProps } from "../TaskApp"

export default function TaskAppServer(props: TaskAppProps, railsContext?: RailsContext) {
  return function RenderedTaskApp() {
    return (
      <StaticRouter location={railsContext?.location ?? "/"}>
        <TaskApp {...props} />
      </StaticRouter>
    )
  }
}
