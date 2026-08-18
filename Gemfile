source "https://rubygems.org"

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 8.1.3", ">= 8.1.3.1"
# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem "propshaft"
# Use sqlite3 as the database for Active Record
gem "sqlite3", ">= 2.1"
# Use the Puma web server [https://github.com/puma/puma]
gem "puma", ">= 5.0"
# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem "turbo-rails"
# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem "stimulus-rails"
# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem "jbuilder"
# Generate OpenAPI/Swagger docs from routes + YARD comments, no RSpec required [https://github.com/a-chacon/oas_rails]
gem "oas_rails"
# Handle Cross-Origin Resource Sharing, needed for RapiDoc's "try it out" requests [https://github.com/cyu/rack-cors]
gem "rack-cors"
# Expose app data/actions to LLM clients over MCP (Model Context Protocol) [https://github.com/modelcontextprotocol/ruby-sdk]
gem "mcp"

# Use Active Model has_secure_password [https://guides.rubyonrails.org/active_model_basics.html#securepassword]
gem "bcrypt", "~> 3.1.7"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Use the database-backed adapters for Rails.cache, Active Job, and Action Cable
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Deploy this application anywhere as a Docker container [https://kamal-deploy.org]
gem "kamal", require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma [https://github.com/basecamp/thruster/]
gem "thruster", require: false

# Use Active Storage variants [https://guides.rubyonrails.org/active_storage_overview.html#transforming-images]
gem "image_processing", "~> 1.2"

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"

  # Audits gems for known security defects (use config/bundler-audit.yml to ignore issues)
  gem "bundler-audit", require: false

  # Static analysis for security vulnerabilities [https://brakemanscanner.org/]
  gem "brakeman", require: false

  # Omakase Ruby styling [https://github.com/rails/rubocop-rails-omakase/]
  gem "rubocop-rails-omakase", require: false

  # Complexity scorer (ABC-based) to flag the worst offenders in app/ and lib/ [https://github.com/seattlerb/flog]
  gem "flog", require: false
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"

  # Richer error page with source context, local/instance variable inspection, and a REPL [https://github.com/BetterErrors/better_errors]
  gem "better_errors"
  # Shows the full stack trace (not just the top frame) in better_errors [https://github.com/banister/binding_of_caller]
  gem "binding_of_caller"
end

group :test do
  # Use system testing [https://guides.rubyonrails.org/testing.html#system-testing]
  gem "capybara"
  gem "selenium-webdriver"
  # Code coverage reporting [https://github.com/simplecov-ruby/simplecov]
  gem "simplecov", require: false
  # Object#stub / Minitest::Mock, extracted out of minitest itself as of minitest 6 [https://github.com/minitest/minitest-mock]
  gem "minitest-mock"
end

# CSS bundling (Tailwind v4 CLI) — kept independent of Shakapacker, which only owns JS/TS
gem "cssbundling-rails", "~> 1.4"

# SSR + hydration for the React frontend [https://github.com/shakacode/react_on_rails]
gem "react_on_rails", "= 17.0"

# >= 10.3.1, not "= 10.3" (10.3.0): DevServerProxy in 10.3.0 relies on rack-proxy's old
# implicit Host-derived backend resolution, which rack-proxy now refuses by default as an
# SSRF guardrail (returns a bare 502 for every /packs/* dev-server asset request). 10.3.1
# fixes this by setting env["rack.backend"] explicitly.
gem "shakapacker", ">= 10.3.1"
