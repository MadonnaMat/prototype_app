# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repo.

## Stack

Rails 8.1, Minitest + fixtures for tests (no RSpec, no FactoryBot — don't add
them without being asked), SQLite, Propshaft/importmap-less JS via
jsbundling-rails, Turbo/Stimulus. This is a normal (non-API-only) Rails app:
it serves an HTML SPA shell (`pages#home`) alongside a JSON API under `/api`.

## Running quality checks while editing

This repo has several checkers beyond the test suite. Run the ones relevant
to what you just touched before considering an edit done — not after every
keystroke, but after finishing a logical chunk of changes to a given
language, and always before wrapping up a task.

**Ruby** (after editing anything under `app/`, `lib/`, `config/`, `db/`):
- `bin/rubocop` — style
- `bin/rails test` — also regenerates the SimpleCov report at `coverage/index.html`
- `bin/rails flog` — complexity gate over `app/` + `lib/`; fails if the single
  worst method's ABC score exceeds 25 (current worst is ~14.6 — see
  `lib/tasks/flog.rake`)
- `bin/rails flog_total` — companion whole-codebase complexity gate on the
  per-method *average* ABC score across `app/` + `lib/` (threshold 8,
  current ~4.2), not a raw total — a raw total scales with codebase size and
  would need bumping in every PR that adds a feature. Catches complexity
  creep from many individually-fine methods that `bin/rails flog` alone
  can't see. Not currently wired into `bin/ci`.
- `bin/brakeman` — security static analysis; run when touching auth, params,
  raw SQL, or anything else user-input-facing
- `bin/bundler-audit` — only needed after changing the `Gemfile`

**JS/TS** (after editing anything under `app/javascript/`):
- `yarn lint` — ESLint style/correctness
- `yarn build:check` — TypeScript typecheck
- `yarn test` / `yarn test:coverage` — Vitest; coverage report at
  `coverage/javascript/index.html` (kept separate from Ruby's `coverage/` —
  Vitest's default output dir collides with SimpleCov's, see
  `vitest.config.mts`'s `reportsDirectory`)
- `yarn quality` — Knip; flags unused files/exports/deps, exits nonzero on
  any finding
- `yarn complexity` — dedicated complexity-only ESLint config
  (`eslint.config.complexity.mjs`, kept separate from the main
  `eslint.config.mjs`); fails above cyclomatic complexity 10 per function.
  Standalone JS complexity tools (`cyclomatic-complexity`, `escomplex`,
  `plato`) either silently fail to parse JSX or are unmaintained — don't
  reach for one without verifying it actually scores a `.tsx` file first.

Don't wire any of these into `bin/ci` / `config/ci.rb` without asking first —
that file gates what's allowed to merge.

## Building a new API resource

Follow the pattern established by `Api::TasksController`
(`app/controllers/api/tasks_controller.rb`) for every new API resource.

### Routing

Namespace everything under `/api`:

```ruby
namespace :api do
  resources :tasks
end
```

### Controller

- Inherit from `Api::BaseController` (`app/controllers/api/base_controller.rb`),
  never directly from `ApplicationController`. It provides:
  - `skip_before_action :verify_authenticity_token` — this app is not
    API-only mode, so `ApplicationController` still enforces CSRF by default;
    API controllers must skip it.
  - `rescue_from` handlers for `ActiveRecord::RecordNotFound`,
    `ActionController::ParameterMissing`, `ActionDispatch::Http::Parameters::ParseError`,
    and a `StandardError` catch-all — **API routes must never render Rails'
    HTML exception/debug pages**, in any environment. If you add a new kind of
    expected error, add a `rescue_from` for it here rather than in the
    subclass, so every resource gets the same handling.
  - `render_resource(status: :ok, **data)` — use for every success response.
  - `render_validation_error(errors)` — use for 422s from failed `save`/`update`.

### Response envelope

Every API response follows this shape — no exceptions:

```jsonc
// success, single resource
{ "task": { ... }, "meta": { "success": true } }

// success, collection
{ "tasks": [ ... ], "meta": { "success": true } }

// success, no payload (e.g. destroy)
{ "meta": { "success": true } }

// validation failure (422)
{ "meta": { "success": false, "errors": { "title": ["can't be blank"] } } }

// any other error (404/400/500)
{ "meta": { "success": false, "error": "message", "backtrace": [...] } }
```

Rules:
- The resource payload (if any) is scoped by the model name — singular for
  one record (`task`), plural for a collection (`tasks`) — as a top-level
  key, sibling to `meta`.
- `success` always lives inside `meta`, never top-level.
- `error`/`errors`/`backtrace` only ever appear inside `meta`.
- `backtrace` is only included when `Rails.env.local?` (dev/test) — never in
  production. Don't add backtraces manually; `render_error` in the base
  controller already handles this.
- Get this from `render_resource` / `render_validation_error` — don't
  hand-roll `render json:` in a new controller.

### OpenAPI docs (oas_rails)

Every action needs YARD tags so it shows up correctly in `/docs`
(config in `config/initializers/oas_rails.rb`). Two gotchas that don't match
the gem's own README examples, discovered the hard way — get these wrong and
`/docs.json` 500s with `OasCore::YARD::TagParsingError`:

- `@request_body_example` — the bracketed type must be `[JSON {...}]` and
  must be the last thing on the line. `[Hash] {...}` (as the official
  example shows) does NOT parse.
  ```ruby
  # @request_body_example Basic task [JSON {"title": "Write docs", "done": false}]
  ```
- `@response` always requires a bracketed type, even for an empty body. Use
  `[nil]`, don't omit it:
  ```ruby
  # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
  ```
- Tags (the grouping shown in the docs UI) are auto-derived per controller
  via `config.default_tags_from = :controller` — don't add manual `@tags`
  comments unless you need to override the default.
- `config.servers` is intentionally `[]` — do not hardcode a host/port here.
  With it empty, RapiDoc's "Try It" defaults to whatever origin the spec was
  actually loaded from, so it keeps working regardless of dev port. A
  hardcoded server list breaks (looks like a CORS error) the moment the app
  isn't running on that exact host/port.

### CORS

`config/initializers/cors.rb` scopes `Rack::Cors` to `/api/*` only — needed
for RapiDoc's "Try It" button. Don't widen this to all routes without reason.

### Tests

Minitest + fixtures, one file per controller under `test/controllers/api/`.
Cover, per action: the happy path, and every error path the action can hit
(404 via `set_task`, 422 via validation, 400 via missing required params) —
assert on `response.content_type` being JSON and on `meta.success`, not just
the HTTP status. See `test/controllers/api/tasks_controller_test.rb` for the
reference shape.
