namespace :oas_rails do
  desc "Export the OpenAPI spec to a static JSON file"
  task export: :environment do
    spec = OasRails.build(config: OasRails.config)
    path = Rails.root.join("tmp/docs.json")
    File.write(path, JSON.pretty_generate(spec))
    puts "Wrote OpenAPI spec to #{path}"
  end
end
