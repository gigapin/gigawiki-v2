import { expect, it } from 'vitest'
import { wikiHTML, sanitizeContent } from 'wiki-content/server'

it('renders text, wrapped HTML and JSON consistently without active content', () => {
  expect(wikiHTML('literal <script>alert(1)</script>')).toContain('&lt;script&gt;')
  expect(wikiHTML('<html><body><p>à è</p></body></html>')).toBe('<p>à è</p>')
  const html = wikiHTML(
    JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [
            {
              type: 'text',
              text: 'Color',
              marks: [{ type: 'textStyle', attrs: { color: '#ff0000' } }],
            },
          ],
        },
      ],
    }),
  )
  expect(html).toContain('text-align:center')
  expect(html).toContain('color:#ff0000')
  expect(
    sanitizeContent(
      '<p style="background-image:url(http://internal)"><img src="file:///etc/passwd" onerror="x()"><script>x()</script></p>',
    ),
  ).not.toMatch(/file:|onerror|<script|internal/)
})
