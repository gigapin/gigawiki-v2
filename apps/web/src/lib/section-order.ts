import type { SectionWithCount } from '@/api/sections'

export function moveSection(sections: SectionWithCount[], id: string, targetId: string) {
  const from = sections.findIndex((section) => section.id === id)
  const to = sections.findIndex((section) => section.id === targetId)
  if (from < 0 || to < 0 || from === to) return null
  const ordered = [...sections]
  ordered.splice(to, 0, ordered.splice(from, 1)[0])
  return ordered
}
