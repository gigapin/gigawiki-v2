import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { useThemeStore } from '../src/stores/theme.store'

const boot = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8')

function root() {
  return { dataset: {}, classList: { toggle: vi.fn() }, style: {} }
}

afterEach(() => {
  vi.unstubAllGlobals()
  useThemeStore.setState({ theme: 'dark' })
})

describe('theme preference', () => {
  it.each(['light', 'dark'])('applies saved %s before React loads', (theme) => {
    const element = root()
    runInNewContext(boot, {
      localStorage: { getItem: () => theme },
      document: { documentElement: element },
    })
    expect(element.dataset.theme).toBe(theme)
    expect(element.style.colorScheme).toBe(theme)
    expect(element.classList.toggle).toHaveBeenCalledWith('dark', theme === 'dark')
  })

  it.each([null, 'invalid'])('defaults to dark for preference %s', (preference) => {
    const element = root()
    runInNewContext(boot, {
      localStorage: { getItem: () => preference },
      document: { documentElement: element },
    })
    expect(element.dataset.theme).toBe('dark')
  })

  it('persists changes and updates the DOM in both directions', () => {
    const element = root()
    const setItem = vi.fn()
    vi.stubGlobal('document', { documentElement: element })
    vi.stubGlobal('localStorage', { setItem })
    for (const theme of ['light', 'dark']) {
      useThemeStore.getState().setTheme(theme)
      expect(useThemeStore.getState().theme).toBe(theme)
      expect(element.dataset.theme).toBe(theme)
      expect(element.style.colorScheme).toBe(theme)
      expect(setItem).toHaveBeenLastCalledWith('gigawiki-theme', theme)
    }
  })

  it('boots and toggles even when storage is blocked', () => {
    const element = root()
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    runInNewContext(boot, { localStorage: storage, document: { documentElement: element } })
    expect(element.dataset.theme).toBe('dark')
    vi.stubGlobal('document', { documentElement: element })
    vi.stubGlobal('localStorage', storage)
    useThemeStore.getState().setTheme('light')
    expect(element.dataset.theme).toBe('light')
    expect(useThemeStore.getState().theme).toBe('light')
  })
})
