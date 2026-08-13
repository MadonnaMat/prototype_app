import { BrowserRouter } from "react-router"
import { TaskApp, type TaskAppProps } from "../TaskApp"

export default function TaskAppClient(props: TaskAppProps) {
  return (
    <BrowserRouter>
      <TaskApp {...props} />
    </BrowserRouter>
  )
}
