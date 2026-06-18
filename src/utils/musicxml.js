// MusicXML → app note-model parser (pure browser JS, no backend).
//
// MusicXML is the common output format of oemer, MuseScore, music21 and most
// notation tools, so importing it bridges the app to all of them: run oemer
// (or any tool) on a score, then upload the resulting .musicxml here.
//
// The parser splits the score into separate lines (staff systems): by the
// MusicXML system-break markers when present, otherwise every N measures.
// Each note is tagged with its measure index so a line can later be split into
// individual measures.

const MEASURES_PER_LINE = 4

// MusicXML <type> → our duration id
const TYPE_MAP = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
  breve: 'w',
  '32nd': '16',
  '64th': '16',
}

function mapType(typeText) {
  return TYPE_MAP[typeText] ?? 'q'
}

function alterToAccidental(alter) {
  const a = parseInt(alter, 10)
  if (a > 0) return '#'
  if (a < 0) return 'b'
  return ''
}

// Parse the notes of a single <measure>, tagging each with the measure index.
function parseMeasureNotes(measure, measureIdx) {
  const notes = []
  measure.querySelectorAll('note').forEach((noteEl) => {
    if (noteEl.querySelector('chord')) return // keep the line monophonic

    const duration = mapType(noteEl.querySelector('type')?.textContent?.trim())

    if (noteEl.querySelector('rest')) {
      notes.push({ type: 'rest', pitch: null, duration, tie: false, measure: measureIdx })
      return
    }

    const pitchEl = noteEl.querySelector('pitch')
    if (!pitchEl) return

    const step = pitchEl.querySelector('step')?.textContent?.trim()
    const octave = pitchEl.querySelector('octave')?.textContent?.trim()
    if (!step || !octave) return

    const pitch = `${step}${alterToAccidental(pitchEl.querySelector('alter')?.textContent)}${octave}`
    const tie = !!noteEl.querySelector('tie[type="start"], tied[type="start"]')

    notes.push({ type: 'note', pitch, duration, tie, measure: measureIdx })
  })
  return notes
}

const SYSTEM_BREAK = 'print[new-system="yes"], print[new-page="yes"]'

/**
 * Parse a MusicXML document into lines (staff systems).
 *
 * @param {string} xmlText
 * @returns {Array<{ lineId: string, notes: Array }>}
 */
export function parseMusicXML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid MusicXML: could not parse the document.')
  }

  const part = doc.querySelector('part')
  if (!part) throw new Error('No <part> found in the MusicXML document.')

  const measures = Array.from(part.querySelectorAll('measure'))
  const hasSystemBreaks = measures.some((m) => m.querySelector(SYSTEM_BREAK))

  const lines = []
  let current = []
  let measuresInLine = 0

  const flush = () => {
    if (current.length) lines.push(current)
    current = []
    measuresInLine = 0
  }

  measures.forEach((measure, measureIdx) => {
    const breakHere = hasSystemBreaks
      ? !!measure.querySelector(SYSTEM_BREAK)
      : measuresInLine >= MEASURES_PER_LINE

    if (breakHere && current.length) flush()

    current.push(...parseMeasureNotes(measure, measureIdx))
    measuresInLine += 1
  })
  flush()

  if (lines.length === 0) {
    throw new Error('No notes found in the MusicXML document.')
  }

  return lines.map((notes, i) => ({ lineId: `line_${i + 1}`, notes }))
}
