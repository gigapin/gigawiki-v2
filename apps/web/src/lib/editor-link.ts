/** Accept web, email and local links, without permitting executable URLs. */
export function normalizeLink(value: string): string | null {
  const href = value.trim()
  if (
    !href ||
    Array.from(href).some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    return null
  if (/^(?:\/(?!\/)|#|\.\.?\/)/.test(href)) return href
  const normalized = /^[a-z][a-z\d+.-]*:/i.test(href) ? href : `https://${href}`
  try {
    const url = new URL(normalized)
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return null
    if (['http:', 'https:'].includes(url.protocol) && !url.hostname) return null
    return normalized
  } catch {
    return null
  }
}
