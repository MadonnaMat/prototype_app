import { Routes, Route, Navigate } from "react-router"
import { TaskListPage } from "@/components/tasks/TaskListPage"
import { TaskFormPage } from "@/components/tasks/TaskFormPage"
import { LoginPage } from "@/components/auth/LoginPage"
import { RegisterPage } from "@/components/auth/RegisterPage"
import { AccountPage } from "@/components/auth/AccountPage"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { ChatPage } from "@/components/chat/ChatPage"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
        <Route path="/account" element={<AccountPage />} />
        {/* Named /assistant rather than /chat — the server-side SPA catch-all in
            config/routes.rb excludes /chat (and its sub-paths) so /chat/completions
            still 404s/errors normally instead of rendering the SPA shell; a client
            route at /chat would collide with that exclusion on a hard reload. */}
        <Route path="/assistant" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
