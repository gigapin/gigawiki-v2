import { normalizeLink } from '../src/lib/editor-link'

it.each([
  ['example.com/docs', 'https://example.com/docs'],
  [' https://example.com ', 'https://example.com'],
  ['/pages/welcome', '/pages/welcome'],
  ['#section', '#section'],
  ['../intro', '../intro'],
  ['mailto:alex@example.com', 'mailto:alex@example.com'],
  ['javascript:alert(1)', null],
  ['data:text/html,test', null],
  ['file:///tmp/test', null],
  ['java\nscript:alert(1)', null],
  ['', null],
  ['https://', null],
])('normalizes link %s', (input, expected) => {
  expect(normalizeLink(input)).toBe(expected)
})
