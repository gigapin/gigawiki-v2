import type { MentionOptions } from '@tiptap/extension-mention'

type SuggestionOptions<T> = MentionOptions<T>['suggestion']
import apiClient from '@/api/client'

type Candidate = { id: string; name: string; unavailable?: boolean }
export const mentionSuggestion: Omit<SuggestionOptions<Candidate>, 'editor'> = {
  char: '@',
  items: async ({ query }) => {
    try {
      const response = await apiClient.get<{ users: Candidate[] }>('/api/v2/users/mentions', {
        params: { search: query },
      })
      return response.data.users
    } catch {
      return [{ id: '', name: 'Cannot load users. Try typing again.', unavailable: true }]
    }
  },
  render: () => {
    let menu: HTMLDivElement | undefined
    let selected = 0
    let current: Parameters<
      NonNullable<ReturnType<NonNullable<SuggestionOptions<Candidate>['render']>>['onStart']>
    >[0]
    const draw = () => {
      if (!menu) return
      menu.replaceChildren()
      const rect = current.clientRect?.()
      if (rect) {
        menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 288))}px`
        menu.style.top = `${rect.bottom + 6}px`
      }
      if (!current.items.length) {
        const empty = document.createElement('p')
        empty.className = 'p-2 text-sm text-muted-foreground'
        empty.textContent = 'No users found'
        menu.append(empty)
      }
      current.items.forEach((item, index) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.role = 'option'
        button.setAttribute('aria-selected', String(index === selected))
        button.disabled = Boolean(item.unavailable)
        button.className = `block w-full rounded p-2 text-left text-sm ${index === selected ? 'bg-accent' : ''}`
        button.textContent = item.name
        button.addEventListener('mousedown', (event) => event.preventDefault())
        button.addEventListener('click', () => current.command({ id: item.id, label: item.name }))
        menu!.append(button)
      })
    }
    return {
      onStart: (props) => {
        current = props
        menu = document.createElement('div')
        menu.role = 'listbox'
        menu.setAttribute('aria-label', 'Mention users')
        menu.className =
          'fixed z-50 max-h-64 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg'
        document.body.append(menu)
        draw()
      },
      onUpdate: (props) => {
        current = props
        selected = 0
        draw()
      },
      onKeyDown: ({ event }) => {
        if (!menu) return false
        if (event.key === 'Escape') {
          menu?.remove()
          menu = undefined
          return true
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const count = current.items.length
          if (count) selected = (selected + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
          draw()
          return true
        }
        if (event.key === 'Enter') {
          const item = current.items[selected]
          if (item && !item.unavailable) current.command({ id: item.id, label: item.name })
          return true
        }
        return false
      },
      onExit: () => {
        menu?.remove()
        menu = undefined
      },
    }
  },
}
