Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :tasks
  end

  mount OasRails::Engine => "/docs"

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "pages#home"

  # Client-side routing fallback (React Router paths like /tasks/new, /tasks/5/edit).
  # Excludes /api and /docs so unmatched requests under those prefixes still 404 normally
  # instead of rendering the SPA shell.
  get "*path", to: "pages#home",
      constraints: ->(request) { !request.path.start_with?("/api/", "/docs") },
      format: false
end
