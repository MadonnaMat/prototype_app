Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :tasks
    resources :conversations, only: %i[index show update destroy]
    resource :session, only: %i[create destroy]
    resource :registration, only: :create
    resource :account, only: %i[show update] do
      post :regenerate_token
    end
  end

  mount OasRails::Engine => "/docs"
  mount McpServerBuilder.transport => "/mcp"
  # Solid Queue dashboard — gated behind the session cookie auth, see
  # MissionControlJobsController and config/initializers/mission_control_jobs.rb.
  mount MissionControl::Jobs::Engine, at: "/jobs"

  # Streaming chat endpoint (OpenAI-compatible path, so official SDKs' chat
  # completions convenience methods work against it out of the box). See
  # app/controllers/chat_controller.rb.
  post "/chat/completions", to: "chat#create"

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "pages#home"

  # Dedicated route (rather than parsing request.path in the controller) so
  # params[:id] is available for seeding SSR props on the React Router
  # /tasks/:id/edit path. Must come before the catch-all below.
  get "/tasks/:id/edit", to: "pages#home"

  # Same reasoning as /tasks/:id/edit above, for seeding SSR props on the
  # React Router /assistant/:conversationId path.
  get "/assistant/:conversation_id", to: "pages#home"

  # Client-side routing fallback (React Router paths like /tasks/new).
  # Excludes /api, /docs, /mcp, /chat, and /jobs (and their sub-paths) so
  # unmatched requests under those prefixes still 404/error normally instead
  # of rendering the SPA shell.
  get "*path", to: "pages#home",
      constraints: ->(request) { !request.path.match?(%r{\A/(api|docs|mcp|chat|jobs)(/|\z)}) },
      format: false
end
