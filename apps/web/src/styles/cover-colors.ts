export const COVER_COLORS = [
  {
    id: 'emerald',
    banner: 'oklch(0.42 0.13 158)',
    bannerDeep: 'oklch(0.26 0.055 158)',
    body: 'oklch(0.20 0.025 158)',
    bodyEdge: 'oklch(0.32 0.04 158)',
    label: 'oklch(0.92 0.04 158)',
    glyph: 'oklch(0.16 0.02 158)',
    swatch: '#2d7a57',
  },
  {
    id: 'blue',
    banner: 'oklch(0.45 0.14 268)',
    bannerDeep: 'oklch(0.28 0.06 268)',
    body: 'oklch(0.20 0.028 268)',
    bodyEdge: 'oklch(0.32 0.045 268)',
    label: 'oklch(0.92 0.04 268)',
    glyph: 'oklch(0.16 0.025 268)',
    swatch: '#3b5bbf',
  },
  {
    id: 'amber',
    banner: 'oklch(0.55 0.13 78)',
    bannerDeep: 'oklch(0.32 0.06 78)',
    body: 'oklch(0.21 0.025 78)',
    bodyEdge: 'oklch(0.33 0.04 78)',
    label: 'oklch(0.95 0.05 78)',
    glyph: 'oklch(0.17 0.02 78)',
    swatch: '#b05a12',
  },
  {
    id: 'red',
    banner: 'oklch(0.48 0.14 18)',
    bannerDeep: 'oklch(0.28 0.065 18)',
    body: 'oklch(0.20 0.028 18)',
    bodyEdge: 'oklch(0.33 0.05 18)',
    label: 'oklch(0.94 0.04 18)',
    glyph: 'oklch(0.16 0.025 18)',
    swatch: '#a63228',
  },
  {
    id: 'slate',
    banner: 'oklch(0.44 0.06 250)',
    bannerDeep: 'oklch(0.26 0.03 250)',
    body: 'oklch(0.20 0.018 250)',
    bodyEdge: 'oklch(0.31 0.03 250)',
    label: 'oklch(0.92 0.025 250)',
    glyph: 'oklch(0.16 0.015 250)',
    swatch: '#37415a',
  },
  {
    id: 'teal',
    banner: 'oklch(0.45 0.12 195)',
    bannerDeep: 'oklch(0.27 0.055 195)',
    body: 'oklch(0.20 0.022 195)',
    bodyEdge: 'oklch(0.31 0.038 195)',
    label: 'oklch(0.92 0.04 195)',
    glyph: 'oklch(0.16 0.018 195)',
    swatch: '#1a6b72',
  },
]

export const CARD_TONES = Object.fromEntries(COVER_COLORS.map((tone) => [tone.id, tone]))

export function toneForColor(id: string) {
  return CARD_TONES[id] ?? COVER_COLORS[0]
}
