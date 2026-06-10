import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML sanitizer for markdown-rendered content (notes, tasks, AI responses).
 * Backed by DOMPurify — works in both server and browser contexts.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'math', 'svg'],
    FORBID_ATTR: ['formaction', 'action'],
    USE_PROFILES: { html: true },
  });
}
