import { Routes, Route, Navigate } from "react-router"
import { TaskListPage } from "@/components/tasks/TaskListPage"
import { TaskFormPage } from "@/components/tasks/TaskFormPage"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TaskListPage />} />
      <Route path="/tasks/new" element={<TaskFormPage />} />
      <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
