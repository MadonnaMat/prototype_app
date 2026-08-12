import { configDefaults, defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/javascript", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./app/javascript/test/setup.ts"],
    // Defense in depth: app/assets/builds is esbuild's output dir. It shouldn't
    // ever contain a *.test.js file (test sources belong under app/javascript,
    // never at its top level where the `build` script's glob would sweep them
    // up as an extra entry point) but exclude it explicitly so a stray bundled
    // file can never get picked up and run as a test suite.
    exclude: [...configDefaults.exclude, "app/assets/builds/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/javascript",
      include: ["app/javascript/**/*.{ts,tsx}"],
      exclude: ["app/javascript/test/**", "**/*.test.{ts,tsx}"],
    },
  },
})
