# Shared by every MCP resource/resource-template `contents` method — mirrors
# how TaskSerialization#rescue_errors centralizes the equivalent check for
# tools — so a newly added resource can't forget the guard the way two
# independent copies of `raise McpUnauthorizedError unless Current.user`
# could silently drift or be omitted.
module McpResourceAuthorization
  module_function

  def require_user!
    raise McpUnauthorizedError unless Current.user
  end
end
