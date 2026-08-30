import { describe, it, expect, vi } from 'vitest'

import { generateSlug, generateUniqueSlug } from './slugify.js'

describe('generateSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(generateSlug('Backend Architecture')).toBe('backend-architecture')
  })

  it('strips punctuation in strict mode', () => {
    expect(generateSlug('What is C++, really?')).toBe('what-is-c-really')
  })
})

describe('generateUniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    const checkExists = vi.fn().mockResolvedValue(false)

    await expect(generateUniqueSlug('Engineering', checkExists)).resolves.toBe('engineering')
    expect(checkExists).toHaveBeenCalledWith('engineering')
  })

  it('appends a 6-character suffix when the base slug is taken', async () => {
    const checkExists = vi.fn().mockResolvedValue(true)

    const slug = await generateUniqueSlug('Engineering', checkExists)

    expect(slug).toMatch(/^engineering-.{6}$/)
  })

  it('produces a different suffix on each collision', async () => {
    const checkExists = vi.fn().mockResolvedValue(true)

    const first = await generateUniqueSlug('Engineering', checkExists)
    const second = await generateUniqueSlug('Engineering', checkExists)

    expect(first).not.toBe(second)
  })
})
