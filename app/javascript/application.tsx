import { createRoot } from "react-dom/client"
import HelloWorld from "./components/HelloWorld"

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("react-root")
  if (container) {
    createRoot(container).render(<HelloWorld name="Rails" />)
  }
})
