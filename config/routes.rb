Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :tasks
  end

  mount OasRails::Engine => "/docs"
  mount McpServerBuilder.transport => "/mcp"

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "pages#home"

  # Dedicated route (rather than parsing request.path in the controller) so
  # params[:id] is available for seeding SSR props on the React Router
  # /tasks/:id/edit path. Must come before the catch-all below.
  get "/tasks/:id/edit", to: "pages#home"

  # Client-side routing fallback (React Router paths like /tasks/new).
  # Excludes /api, /docs, and /mcp (and their sub-paths) so unmatched
  # requests under those prefixes still 404/error normally instead of
  # rendering the SPA shell.
  get "*path", to: "pages#home",
      constraints: ->(request) { !request.path.match?(%r{\A/(api|docs|mcp)(/|\z)}) },
      format: false
end
