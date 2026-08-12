import tseslint from "typescript-eslint"
import globals from "globals"

// A dedicated, complexity-only config (kept separate from eslint.config.mjs's
// style/correctness rules) — mirrors bin/flog's role for the Ruby side.
// Threshold of 10 matches a common cyclomatic-complexity rule of thumb for
// "worth a second look"; adjust if it starts false-positiving on real code.
export default tseslint.config(
  { ignores: ["app/assets/builds/**", "vendor/**", "public/**"] },
  {
    files: ["app/javascript/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: globals.browser,
    },
    rules: {
      complexity: ["error", 10],
    },
  }
)
