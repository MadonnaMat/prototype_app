class Current < ActiveSupport::CurrentAttributes
  # :session backs the browser SPA's cookie-based login (set in
  # Api::SessionsController, read in Api::BaseController#authenticate_via_cookie).
  # :user is a plain attribute rather than a delegate to :session, since
  # token-authenticated requests (MCP, external API clients) have no
  # Session row at all — both auth paths set Current.user explicitly.
  attribute :session, :user
end
