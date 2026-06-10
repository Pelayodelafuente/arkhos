import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/utils/sanitize'

describe('sanitizeHtml (DOMPurify)', () => {
  it('elimina scripts', () => {
    expect(sanitizeHtml('<p>hola</p><script>alert(1)</script>')).toBe('<p>hola</p>')
  })

  it('neutraliza onerror sin comillas (bypass del sanitizador regex anterior)', () => {
    const out = sanitizeHtml('<img src=x onerror=alert(document.cookie)>')
    expect(out).not.toContain('onerror')
  })

  it('neutraliza onerror con comillas', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
  })

  it('neutraliza tags mutados anidados', () => {
    const out = sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>')
    expect(out).not.toContain('<script')
  })

  it('elimina javascript: en href', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
    expect(out).not.toContain('javascript:')
  })

  it('elimina iframes y formularios', () => {
    expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>')).not.toContain('iframe')
    expect(sanitizeHtml('<form action="/steal"><input></form>')).not.toContain('<form')
  })

  it('preserva HTML legítimo de markdown', () => {
    const html = '<h2>Título</h2><p>Texto con <strong>negrita</strong> y <em>cursiva</em>.</p><ul><li>item</li></ul>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('preserva enlaces seguros', () => {
    const out = sanitizeHtml('<a href="https://example.com">link</a>')
    expect(out).toContain('href="https://example.com"')
  })

  it('preserva tablas y código', () => {
    const html = '<table><tbody><tr><td>celda</td></tr></tbody></table><pre><code>const x = 1</code></pre>'
    expect(sanitizeHtml(html)).toBe(html)
  })
})
