/**
 * Minimal Markdown → HTML renderer (no external deps).
 * Handles: code blocks, inline code, bold, italic, headers, lists, line breaks.
 * Output is sanitized to prevent XSS — no raw HTML pass-through.
 */
export function formatMarkdown(text: string): string {
  if (!text) return ''

  // Escape HTML entities to prevent XSS
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  // Split on fenced code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g)

  const rendered = parts
    .map((part) => {
      if (part.startsWith('```')) {
        // Fenced code block
        const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/)
        if (match) {
          const lang = escape(match[1] || '')
          const code = escape(match[2] ?? '')
          return `<pre><code class="language-${lang}">${code}</code></pre>`
        }
        return `<pre><code>${escape(part.slice(3, -3))}</code></pre>`
      }

      // Process inline elements
      return part
        .split('\n')
        .map((line) => {
          // ATX headings
          const h3 = line.match(/^### (.+)/)
          if (h3) return `<strong>${escape(h3[1])}</strong>`
          const h2 = line.match(/^## (.+)/)
          if (h2) return `<strong style="font-size:1.05em">${escape(h2[1])}</strong>`
          const h1 = line.match(/^# (.+)/)
          if (h1) return `<strong style="font-size:1.1em">${escape(h1[1])}</strong>`

          // Unordered list items
          if (/^[-*] /.test(line)) {
            return `<li>${inlineFormat(line.slice(2))}</li>`
          }

          // Ordered list items
          if (/^\d+\. /.test(line)) {
            return `<li>${inlineFormat(line.replace(/^\d+\. /, ''))}</li>`
          }

          return `<p>${inlineFormat(line)}</p>`
        })
        .join('')
    })
    .join('')

  // Wrap consecutive <li> elements in <ul>
  return rendered.replace(/(<li>.*?<\/li>)+/gs, (m) => `<ul>${m}</ul>`)

  function inlineFormat(s: string): string {
    return escape(s)
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
  }
}
