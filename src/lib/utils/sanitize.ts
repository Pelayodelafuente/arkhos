/**
 * Lightweight HTML sanitizer for markdown-rendered content.
 * Allows a safe subset of HTML tags and strips dangerous attributes.
 * No external dependencies — works in both server and browser contexts.
 */

const DANGEROUS_TAGS = /(<\s*(script|iframe|object|embed|form|base|meta|link|style|svg|math)\b[^>]*>[\s\S]*?<\/\s*\2\s*>|<\s*(script|iframe|object|embed|form|base|meta|link|style|svg|math)\b[^>]*\/?>)/gi;

// Remove dangerous attributes: event handlers, javascript: URLs, data: URLs
const DANGEROUS_ATTRS = /\s(on\w+|srcdoc|formaction|action)\s*=\s*(['"])[^'"]*\2/gi;
const DANGEROUS_HREF = /(href|src|action)\s*=\s*(['"])\s*(javascript:|data:|vbscript:)[^'"]*\2/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_ATTRS, '')
    .replace(DANGEROUS_HREF, '$1=$2#$2');
}
