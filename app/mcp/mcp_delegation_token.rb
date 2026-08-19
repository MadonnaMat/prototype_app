# Short-lived, HMAC-signed credential that lets a cookie-authenticated
# /chat/completions request call into /mcp as the same user. Two things
# rule out the more obvious alternatives:
#
# - Forwarding the session cookie itself so /mcp could authenticate via
#   cookie the way Api::BaseController does would make /mcp's state-
#   changing tool calls reachable via an ambient credential the browser
#   attaches automatically to *any* cross-site request — a CSRF hole,
#   since /mcp (a raw Rack app, not an ActionController) has no CSRF
#   token check the way cookie-authenticated ActionController requests do.
# - Forwarding/minting the user's persistent api_token would work but
#   `regenerate_api_token!` overwrites the one digest column a User has,
#   so minting one on every chat message would invalidate whatever
#   standing token the same account already has in use elsewhere (e.g.
#   bin/mcp-inspector, a real external API client).
#
# This token is a capability an attacker's cross-site request has no way
# to obtain (unlike a cookie), doesn't touch the persistent api_token_digest
# column at all, and expires almost immediately since it only needs to
# survive a single request's worth of MCP round trips.
#
# Deliberately not one-time-use: it's reused across every MCP call within
# one chat request (one McpClient/MCP session per request, not one per tool
# call), and it never leaves the server process — it's minted by
# ChatController and only ever sent on the internal loopback call to /mcp,
# never returned to whoever called /chat/completions. Anyone in a position
# to steal it off that loopback call (server-side log/memory access) would
# already be able to read secret_key_base and mint their own, so one-time
# use wouldn't close a real gap — it would just add an MCP handshake per
# tool call for no practical benefit.
module McpDelegationToken
  EXPIRY = 1.minute
  PREFIX = "mcpdeleg_"

  def self.verifier
    Rails.application.message_verifier(:mcp_delegation)
  end

  def self.generate(user)
    PREFIX + verifier.generate([ user.id, EXPIRY.from_now.to_i ])
  end

  def self.authenticate(token)
    return unless token&.start_with?(PREFIX)

    user_id, expires_at = verifier.verify(token.delete_prefix(PREFIX))
    return if Time.at(expires_at).past?

    User.find_by(id: user_id)
  rescue ActiveSupport::MessageVerifier::InvalidSignature
    nil
  end
end
