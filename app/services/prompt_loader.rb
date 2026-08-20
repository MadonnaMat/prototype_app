# Loads prompt text from config/prompts/*.md rather than hardcoding it as a
# Ruby string, so prompt wording can be reviewed/edited independently of
# code. Caches in production; re-reads every call otherwise (mirrors
# Rails' own config.enable_reloading, rather than inventing a bespoke flag)
# so edits show up without a server restart in dev.
module PromptLoader
  def self.load(name)
    return read(name) if Rails.application.config.enable_reloading

    @cache ||= {}
    @cache[name] ||= read(name)
  end

  def self.read(name)
    Rails.root.join("config", "prompts", "#{name}.md").read
  end
end
