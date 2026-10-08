export const COVER_COLORS = [
  {
    id: 'emerald',
    banner: 'oklch(0.42 0.13 158)',
    bannerDeep: 'oklch(0.26 0.055 158)',
    body: 'var(--cover-emerald-body)',
    bodyEdge: 'var(--cover-emerald-bodyEdge)',
    label: 'oklch(0.92 0.04 158)',
    glyph: 'oklch(0.16 0.02 158)',
    swatch: '#2d7a57',
  },
  {
    id: 'blue',
    banner: 'oklch(0.45 0.14 268)',
    bannerDeep: 'oklch(0.28 0.06 268)',
    body: 'var(--cover-blue-body)',
    bodyEdge: 'var(--cover-blue-bodyEdge)',
    label: 'oklch(0.92 0.04 268)',
    glyph: 'oklch(0.16 0.025 268)',
    swatch: '#3b5bbf',
  },
  {
    id: 'amber',
    banner: 'oklch(0.55 0.13 78)',
    bannerDeep: 'oklch(0.32 0.06 78)',
    body: 'var(--cover-amber-body)',
    bodyEdge: 'var(--cover-amber-bodyEdge)',
    label: 'oklch(0.95 0.05 78)',
    glyph: 'oklch(0.17 0.02 78)',
    swatch: '#b05a12',
  },
  {
    id: 'red',
    banner: 'oklch(0.48 0.14 18)',
    bannerDeep: 'oklch(0.28 0.065 18)',
    body: 'var(--cover-red-body)',
    bodyEdge: 'var(--cover-red-bodyEdge)',
    label: 'oklch(0.94 0.04 18)',
    glyph: 'oklch(0.16 0.025 18)',
    swatch: '#a63228',
  },
  {
    id: 'slate',
    banner: 'oklch(0.44 0.06 250)',
    bannerDeep: 'oklch(0.26 0.03 250)',
    body: 'var(--cover-slate-body)',
    bodyEdge: 'var(--cover-slate-bodyEdge)',
    label: 'oklch(0.92 0.025 250)',
    glyph: 'oklch(0.16 0.015 250)',
    swatch: '#37415a',
  },
  {
    id: 'teal',
    banner: 'oklch(0.45 0.12 195)',
    bannerDeep: 'oklch(0.27 0.055 195)',
    body: 'var(--cover-teal-body)',
    bodyEdge: 'var(--cover-teal-bodyEdge)',
    label: 'oklch(0.92 0.04 195)',
    glyph: 'oklch(0.16 0.018 195)',
    swatch: '#1a6b72',
  },
]

export const CARD_TONES = Object.fromEntries(COVER_COLORS.map((tone) => [tone.id, tone]))

export function toneForColor(id: string) {
  return CARD_TONES[id] ?? COVER_COLORS[0]
}
