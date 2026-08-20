import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

// react-markdown renders straight to React elements (no dangerouslySetInnerHTML) and, without
// rehype-raw, strips any raw HTML in the source rather than rendering it — so LLM- or
// user-authored content can't inject markup here.

// Only follow schemes a click can't turn into script execution — no `javascript:`/`data:`/etc.
function isSafeHref(href: string | undefined): href is string {
  if (!href) return false
  if (href.startsWith("#") || href.startsWith("/")) return true
  return /^(https?:|mailto:)/i.test(href)
}

const components: Components = {
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-0.5 pl-4 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-0.5 pl-4 first:mt-0">{children}</ol>,
  a: ({ children, href }) =>
    isSafeHref(href) ? (
      <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  // No live <img> — rendering one would fire an unprompted GET as soon as the message displays,
  // which is unacceptable for LLM-authored (or relayed, e.g. task-title) content. Render a
  // click-through link instead, same trust model as the `a` override above.
  img: ({ src, alt }) =>
    isSafeHref(typeof src === "string" ? src : undefined) ? (
      <a href={src} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {alt || "image"}
      </a>
    ) : (
      <>{alt}</>
    ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md bg-black/10 p-2 font-mono text-xs first:mt-0 dark:bg-white/10">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-2 border-l-2 border-current/30 pl-2 italic first:mt-0">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto first:mt-0">
      <table className="border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-current/20 px-2 py-1 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-current/20 px-2 py-1">{children}</td>,
}

export interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
