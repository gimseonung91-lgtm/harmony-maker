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

import { DOTTED_VARIANT } from '../domain/durations'

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

function mapType(typeText, dotted) {
  const base = TYPE_MAP[typeText] ?? 'q'
  return dotted ? (DOTTED_VARIANT[base] ?? base) : base
}

function alterToAccidental(alter) {
  const a = parseInt(alter, 10)
  if (a > 0) return '#'
  if (a < 0) return 'b'
  return ''
}

function beamConnectsToNext(noteEl) {
  const beamText = Array.from(noteEl.querySelectorAll('beam'))
    .find((beamEl) => (beamEl.getAttribute('number') ?? '1') === '1')
    ?.textContent
    ?.trim()
    ?.toLowerCase()
  return beamText === 'begin' || beamText === 'continue'
}

// Parse the notes of a single <measure>, tagging each with the measure index.
// Only the top staff and the first voice are kept: piano-vocal scores put the
// vocal line on staff 1 and the piano grand staff on staves 2-3, and a second
// voice in the same staff would corrupt the sequential rhythm timeline.
function parseMeasureNotes(measure, measureIdx, voiceState) {
  const notes = []
  measure.querySelectorAll('note').forEach((noteEl) => {
    if (noteEl.querySelector('chord')) return // keep the line monophonic

    const staff = noteEl.querySelector('staff')?.textContent?.trim()
    if (staff && staff !== '1') return // drop piano/accompaniment staves

    const voice = noteEl.querySelector('voice')?.textContent?.trim()
    if (voice) {
      voiceState.first ??= voice
      if (voice !== voiceState.first) return // keep the melody voice only
    }

    const duration = mapType(
      noteEl.querySelector('type')?.textContent?.trim(),
      noteEl.querySelector('dot') != null,
    )

    if (noteEl.querySelector('rest')) {
      notes.push({ type: 'rest', pitch: null, duration, tie: false, beam: false, measure: measureIdx })
      return
    }

    const pitchEl = noteEl.querySelector('pitch')
    if (!pitchEl) return

    const step = pitchEl.querySelector('step')?.textContent?.trim()
    const octave = pitchEl.querySelector('octave')?.textContent?.trim()
    if (!step || !octave) return

    const pitch = `${step}${alterToAccidental(pitchEl.querySelector('alter')?.textContent)}${octave}`
    const tie = !!noteEl.querySelector('tie[type="start"], tied[type="start"]')
    const beam = beamConnectsToNext(noteEl)

    notes.push({ type: 'note', pitch, duration, tie, beam, measure: measureIdx })
  })
  return notes
}

const SYSTEM_BREAK = 'print[new-system="yes"], print[new-page="yes"]'

// Part names that clearly identify the vocal line
const VOCAL_NAME = /voc|voice|sing|lead|melod|보컬|노래|멜로디|목소리/i

const STEP_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function partStaffCount(part) {
  return parseInt(part.querySelector('attributes > staves')?.textContent ?? '1', 10)
}

function pitchHeight(noteEl) {
  const pitchEl = noteEl.querySelector('pitch')
  const step = pitchEl?.querySelector('step')?.textContent?.trim()
  const octave = parseInt(pitchEl?.querySelector('octave')?.textContent ?? '', 10)
  if (!step || !Number.isFinite(octave)) return null
  return octave * 12 + (STEP_TO_SEMITONE[step] ?? 0)
}

function partProfile(part) {
  const noteEls = Array.from(part.querySelectorAll('note'))
    .filter((noteEl) => !noteEl.querySelector('chord'))
  const pitchedHeights = noteEls
    .map((noteEl) => pitchHeight(noteEl))
    .filter((height) => height != null)
  const measureCount = Math.max(1, part.querySelectorAll('measure').length)
  const restCount = noteEls.filter((noteEl) => noteEl.querySelector('rest')).length
  const lyricCount = noteEls.filter((noteEl) => noteEl.querySelector('lyric text')).length
  const averagePitch = pitchedHeights.length
    ? pitchedHeights.reduce((sum, height) => sum + height, 0) / pitchedHeights.length
    : 0

  return {
    singleStaff: partStaffCount(part) <= 1,
    lyricCount,
    restRatio: noteEls.length ? restCount / noteEls.length : 0,
    pitchedDensity: pitchedHeights.length / measureCount,
    averagePitch,
  }
}

function vocalCandidateScore(part) {
  const profile = partProfile(part)
  return (
    (profile.singleStaff ? 100 : 0)
    + profile.lyricCount * 80
    + profile.restRatio * 20
    + profile.averagePitch / 12
    - Math.max(0, profile.pitchedDensity - 2) * 8
  )
}

function pickVocalPart(doc) {
  const parts = Array.from(doc.querySelectorAll('part'))
  if (parts.length <= 1) return parts[0] ?? null

  const namedVocalIds = Array.from(doc.querySelectorAll('score-part'))
    .filter((sp) => VOCAL_NAME.test(sp.querySelector('part-name')?.textContent ?? ''))
    .map((sp) => sp.getAttribute('id'))
  const named = parts.find((p) => namedVocalIds.includes(p.getAttribute('id')))
  if (named) return named

  return parts
    .map((part, order) => ({ part, order, score: vocalCandidateScore(part) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)[0]
    ?.part ?? parts[0]
}

// MusicXML <fifths> (circle of fifths position) → key-signature name
const FIFTHS_TO_KEY = {
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'Gb',
  '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb',
}

// Read the score's key & time signature from the first <attributes> block.
function parseMeta(part) {
  const meta = {}
  const fifths = part.querySelector('key > fifths')?.textContent?.trim()
  if (fifths != null && FIFTHS_TO_KEY[fifths]) meta.keySignature = FIFTHS_TO_KEY[fifths]
  const beats = part.querySelector('time > beats')?.textContent?.trim()
  const beatType = part.querySelector('time > beat-type')?.textContent?.trim()
  if (beats && beatType) meta.timeSignature = `${beats}/${beatType}`
  return meta
}

/**
 * Parse a MusicXML document into lines (staff systems) plus score metadata.
 *
 * @param {string} xmlText
 * @returns {{ lines: Array<{ lineId: string, notes: Array }>, meta: { keySignature?: string, timeSignature?: string } }}
 */
export function parseMusicXML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('올바르지 않은 MusicXML: 문서를 해석할 수 없습니다.')
  }

  const part = pickVocalPart(doc)
  if (!part) throw new Error('MusicXML 문서에서 <part>를 찾을 수 없습니다.')

  const measures = Array.from(part.querySelectorAll('measure'))
  const hasSystemBreaks = measures.some((m) => m.querySelector(SYSTEM_BREAK))

  const lines = []
  let current = []
  let measuresInLine = 0
  const voiceState = { first: null } // first voice id seen = the melody voice

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

    current.push(...parseMeasureNotes(measure, measureIdx, voiceState))
    measuresInLine += 1
  })
  flush()

  if (lines.length === 0) {
    throw new Error('MusicXML 문서에서 음표를 찾지 못했습니다.')
  }

  return {
    lines: lines.map((notes, i) => ({ lineId: `line_${i + 1}`, notes })),
    meta: parseMeta(part),
  }
}
