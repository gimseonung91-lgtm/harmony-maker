// Diatonic scale degrees for each key (chromatic index 0=C … 11=B)
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
// Flat spellings of the same chromatic indexes, used for flat key signatures
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
// Keys whose diatonic notes are spelled with flats (F major has Bb, etc.)
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])

// Major diatonic steps as semitone offsets from root
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]

const KEY_ROOTS = {
  C: 0,  G: 7,  D: 2,  A: 9,  E: 4,  B: 11, 'F#': 6,
  F: 5,  Bb: 10, Eb: 3, Ab: 8,  Db: 1,  Gb: 6,
}

function buildScale(keySignature) {
  const root = KEY_ROOTS[keySignature] ?? 0
  return MAJOR_INTERVALS.map((interval) => (root + interval) % 12)
}

function parsePitch(pitch) {
  // e.g. "C4" → { name: "C", octave: 4 }
  const match = pitch.match(/^([A-G]#?b?)(\d)$/)
  if (!match) return null
  return { name: match[1], octave: parseInt(match[2], 10) }
}

function chromaticIndex(noteName) {
  const sharp = CHROMATIC.indexOf(noteName)
  return sharp !== -1 ? sharp : CHROMATIC_FLAT.indexOf(noteName)
}

function buildPitch(name, octave) {
  return `${name}${octave}`
}

/**
 * Given a melody pitch and key signature, return [third, fifth] diatonic harmony pitches.
 * Returns null entries if pitch cannot be parsed.
 */
export function computeHarmony(pitch, keySignature) {
  const parsed = parsePitch(pitch)
  if (!parsed) return [null, null]

  const scale = buildScale(keySignature)
  const noteChroma = chromaticIndex(parsed.name)
  if (noteChroma === -1) return [null, null]

  const degreeIndex = scale.indexOf(noteChroma)
  if (degreeIndex === -1) {
    // Note is not diatonic — return chromatic approximation
    return [null, null]
  }

  // +2 scale steps = diatonic 3rd, +4 scale steps = diatonic 5th
  const third = scale[(degreeIndex + 2) % 7]
  const fifth = scale[(degreeIndex + 4) % 7]

  // Determine octave: if harmony note chroma < melody chroma, push up an octave
  const thirdOctave = third < noteChroma ? parsed.octave + 1 : parsed.octave
  const fifthOctave = fifth < noteChroma ? parsed.octave + 1 : parsed.octave

  // Spell the result to match the key signature (Bb in F major, not A#)
  const spelling = FLAT_KEYS.has(keySignature) ? CHROMATIC_FLAT : CHROMATIC

  return [
    buildPitch(spelling[third], thirdOctave),
    buildPitch(spelling[fifth], fifthOctave),
  ]
}

/**
 * Return a single diatonic harmony pitch for the given interval.
 * @param {string} pitch     – e.g. "C4"
 * @param {string} key       – key signature, e.g. "C"
 * @param {'3rd'|'5th'} interval
 * @returns {string|null} harmonized pitch, or null if not diatonic
 */
export function harmonize(pitch, key, interval) {
  const [third, fifth] = computeHarmony(pitch, key)
  return interval === '3rd' ? third : fifth
}
