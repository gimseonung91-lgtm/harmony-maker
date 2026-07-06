// VexFlow pitch string ↔ our internal "C4" format
// (Duration metadata lives in src/domain/durations.js — the one registry.)

export const PITCHES_IN_OCTAVE = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

// Project-setting choices (shared by the header controls and Settings panel)
export const KEY_SIGS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']
export const CLEFS = ['treble', 'bass', 'alto', 'tenor']
export const TIME_SIGS = ['4/4', '3/4', '2/4', '6/8', '2/2']

// Staff Y-position → pitch (for treble clef, staff top = B5, each step = half line-space)
// We use a simplified grid: each "slot" is 10px and maps to a pitch step
export const SLOT_HEIGHT = 10 // px per diatonic step

const TREBLE_PITCHES = [
  'F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3',
]

/**
 * Convert a canvas Y offset (relative to the top staff line) to a pitch string.
 * Assumes treble clef with 10px per diatonic step.
 */
export function yToPitch(yOffset) {
  const slotIndex = Math.round(yOffset / SLOT_HEIGHT)
  const clamped = Math.max(0, Math.min(slotIndex, TREBLE_PITCHES.length - 1))
  return TREBLE_PITCHES[clamped]
}

/**
 * Convert a pitch string to the Y offset from the top staff line (treble clef).
 */
export function pitchToY(pitch) {
  const idx = TREBLE_PITCHES.indexOf(pitch)
  return idx === -1 ? 5 * SLOT_HEIGHT : idx * SLOT_HEIGHT
}

/**
 * Convert our internal pitch "C4" to VexFlow key format "c/4".
 */
export function pitchToVex(pitch) {
  const match = pitch.match(/^([A-G]#?b?)(\d)$/)
  if (!match) return 'c/4'
  return `${match[1].toLowerCase()}/${match[2]}`
}
