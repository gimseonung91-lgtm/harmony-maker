// The single authoritative registry for note-duration metadata.
// Every consumer (notation, audio scheduling, toolbar palettes, keyboard
// shortcuts) derives its view from these entries — do not duplicate any of
// these fields elsewhere.
//
// `vex` is the VexFlow duration code; `vexDots` adds augmentation dots.
// `tone` is the Tone.js notation. `beats` is in quarter-note units.

export const DURATION_ENTRIES = Object.freeze([
  Object.freeze({
    id: 'w', label: '온음표', symbol: '𝅝',
    restLabel: '온쉼표', restSymbol: '𝄻', showInRestPalette: true,
    beats: 4, vex: 'w', vexDots: 0, tone: '1n', shortcut: '1',
  }),
  Object.freeze({
    id: 'h', label: '2분음표', symbol: '𝅗𝅥',
    restLabel: '2분쉼표', restSymbol: '𝄼', showInRestPalette: true,
    beats: 2, vex: 'h', vexDots: 0, tone: '2n', shortcut: '2',
  }),
  Object.freeze({
    id: 'hd', label: '점2분음표', symbol: '𝅗𝅥.',
    restLabel: null, restSymbol: null, showInRestPalette: false,
    beats: 3, vex: 'h', vexDots: 1, tone: '2n.', shortcut: '7',
  }),
  Object.freeze({
    id: 'q', label: '4분음표', symbol: '♩',
    restLabel: '4분쉼표', restSymbol: '𝄽', showInRestPalette: true,
    beats: 1, vex: 'q', vexDots: 0, tone: '4n', shortcut: '3',
  }),
  Object.freeze({
    id: 'qd', label: '점4분음표', symbol: '♩.',
    restLabel: null, restSymbol: null, showInRestPalette: false,
    beats: 1.5, vex: 'q', vexDots: 1, tone: '4n.', shortcut: '6',
  }),
  Object.freeze({
    id: '8', label: '8분음표', symbol: '♪',
    restLabel: '8분쉼표', restSymbol: '𝄾', showInRestPalette: true,
    beats: 0.5, vex: '8', vexDots: 0, tone: '8n', shortcut: '4',
  }),
  Object.freeze({
    id: '8d', label: '점8분음표', symbol: '♪.',
    restLabel: null, restSymbol: null, showInRestPalette: false,
    beats: 0.75, vex: '8', vexDots: 1, tone: '8n.', shortcut: '8',
  }),
  Object.freeze({
    id: '16', label: '16분음표', symbol: '𝅘𝅥𝅯',
    restLabel: '16분쉼표', restSymbol: '𝄿', showInRestPalette: true,
    beats: 0.25, vex: '16', vexDots: 0, tone: '16n', shortcut: '5',
  }),
  Object.freeze({
    id: '16d', label: '점16분음표', symbol: '𝅘𝅥𝅯.',
    restLabel: null, restSymbol: null, showInRestPalette: false,
    beats: 0.375, vex: '16', vexDots: 1, tone: '16n.', shortcut: '9',
  }),
])

// Base duration id → its dotted variant (used by the MusicXML importer)
export const DOTTED_VARIANT = Object.freeze({ h: 'hd', q: 'qd', 8: '8d', 16: '16d' })

const BY_ID = new Map(DURATION_ENTRIES.map((e) => [e.id, e]))
const QUARTER = BY_ID.get('q')

/**
 * Look up a duration entry. Unknown, null, or malformed ids normalize to
 * quarter — the one deliberate reliability contract shared by all consumers.
 */
export function getDuration(id) {
  return BY_ID.get(id) ?? QUARTER
}

export function beatsOf(id) {
  return getDuration(id).beats
}

// Note palette (toolbar "Duration" row + note tiles)
export const DURATIONS = DURATION_ENTRIES

// Rest palette — exactly the entries flagged for it (w, h, q, 8, 16)
export const RESTS = Object.freeze(
  DURATION_ENTRIES.filter((e) => e.showInRestPalette).map((e) =>
    Object.freeze({ id: e.id, label: e.restLabel, symbol: e.restSymbol })
  )
)

// Keyboard shortcut → duration id (number-key handling)
export const SHORTCUT_TO_DURATION = Object.freeze(
  Object.fromEntries(DURATION_ENTRIES.map((e) => [e.shortcut, e.id]))
)
