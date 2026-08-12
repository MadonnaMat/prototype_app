# config/initializers/oas_rails.rb
OasRails.configure do |config|
  # Basic Information about the API
  config.info.title = "Prototype App API"
  config.info.version = "1.0.0"
  config.info.summary = "JSON API for the Prototype App"
  config.info.description = "Auto-generated OpenAPI docs for everything under /api."

  # Servers Information. For more details follow: https://spec.openapis.org/oas/latest.html#server-object
  # Left empty on purpose: with no servers declared, RapiDoc's "Try It" defaults to the
  # origin the spec itself was loaded from, so it works no matter what host/port you're
  # actually running on (a hardcoded "localhost:3000" breaks as soon as that's not true).
  config.servers = []

  # Tag Information. For more details follow: https://spec.openapis.org/oas/latest.html#tag-object
  # Add an entry per resource here if you want a description shown above its group in the docs
  # (e.g. { name: "Tasks", description: "..." }); purely optional, grouping itself is automatic below.
  config.tags = []

  # Optional Settings (Uncomment to use)

  # Extract default tags of operations from namespace or controller. Can be set to :namespace or :controller
  # :controller groups endpoints by resource (Tasks, Users, ...) instead of needing an
  # explicit `@tags` YARD comment on every controller as new API resources get added.
  config.default_tags_from = :controller

  # Automatically detect request bodies for create/update methods
  # Default: true
  # config.autodiscover_request_body = false

  # Automatically detect responses from controller renders
  # Default: true
  # config.autodiscover_responses = false

  # API path configuration if your API is under a different namespace
  config.api_path = "/api"

  # Apply your custom layout. Should be the name of your layout file
  # Example: "application" if file named application.html.erb
  # Default: false
  # config.layout = "application"

  # Override general rapidoc settings
  # config.rapidoc_configuration
  # default: {}

  # Add a logo to rapidoc
  # config.rapidoc_logo_url
  # default: nil

  # Override specific rapidoc theme settings
  # config.rapidoc_theme_configuration
  # default: {}

  # Excluding custom controllers or controllers#action
  # Example: ["projects", "users#new"]
  # config.ignored_actions = []

  # #######################
  # Authentication Settings
  # #######################

  # Whether to authenticate all routes by default
  # Default is true; set to false if you don't want all routes to include security schemas by default
  # This API has no authentication yet, so don't mark every route as requiring it.
  config.authenticate_all_routes_by_default = false

  # Default security schema used for authentication
  # Choose a predefined security schema
  # [:api_key_cookie, :api_key_header, :api_key_query, :basic, :bearer, :bearer_jwt, :mutual_tls]
  # config.security_schema = :bearer

  # Custom security schemas
  # You can uncomment and modify to use custom security schemas
  # Please follow the documentation: https://spec.openapis.org/oas/latest.html#security-scheme-object
  #
  # config.security_schemas = {
  #  bearer:{
  #   "type": "apiKey",
  #   "name": "api_key",
  #   "in": "header"
  #  }
  # }

  # ###########################
  # Default Responses (Errors)
  # ###########################

  # The default responses errors are set only if the action allow it.
  # Example, if you add forbidden then it will be added only if the endpoint requires authentication.
  # Example: not_found will be setted to the endpoint only if the operation is a show/update/destroy action.
  # config.set_default_responses = true
  # config.possible_default_responses = [:not_found, :unauthorized, :forbidden, :internal_server_error, :unprocessable_entity]
  # config.response_body_of_default = "Hash{ message: String }"
  # config.response_body_of_unprocessable_entity= "Hash{ errors: Array<String> }"
end
