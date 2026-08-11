import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/javascript", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./app/javascript/test/setup.ts"],
  },
})
