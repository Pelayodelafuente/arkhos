import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

export function markdownToHtml(content: string): string {
  if (!content || content.trim() === '') return ''
  // Already HTML — no conversion needed
  if (/^<[a-z][\s\S]*>/i.test(content.trim())) return content
  return marked.parse(content) as string
}
